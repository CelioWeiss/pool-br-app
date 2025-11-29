

'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Appointment, ServiceLocation, DayOfWeek } from '@/lib/types';
import { 
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  set,
  format
} from 'date-fns';

const dayOfWeekMap: Record<DayOfWeek, number> = {
  // Sunday is 0, Monday is 1, etc.
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

// This hook now unifies manual appointments with automatically generated recurring appointments
// for a given month, providing a complete schedule.
export function useUnifiedAppointments(franchiseId: string | null | undefined, month: Date) {
    const firestore = useFirestore();

    // Fetch all locations for the franchise directly
    const allLocationsQuery = useMemo(() => {
        if (!firestore || !franchiseId) return null;
        return query(collection(firestore, `franchises/${franchiseId}/locations`));
    }, [firestore, franchiseId]);
    const { data: allLocations, isLoading: isLoadingLocations } = useCollection<ServiceLocation>(allLocationsQuery);

    // Fetch manual appointments for the current month interval
    const start = useMemo(() => startOfMonth(month), [month]);
    const end = useMemo(() => endOfMonth(month), [month]);
    
    const manualAppointmentsQuery = useMemo(() => {
        if (!firestore || !franchiseId) return null;
        return query(
            collection(firestore, 'franchises', franchiseId, 'appointments'),
            where('scheduledDateTime', '>=', start.toISOString()),
            where('scheduledDateTime', '<=', end.toISOString())
        );
    }, [firestore, franchiseId, start, end]);

    const { data: manualAppointments, isLoading: isLoadingManualAppointments } = useCollection<Appointment>(manualAppointmentsQuery);

    // Memoized calculation to combine manual and recurring appointments
    const allAppointments = useMemo(() => {
        if (isLoadingLocations || isLoadingManualAppointments) {
          return [];
        }
      
        const appointmentsMap = new Map<string, Appointment>();
      
        // 1. Add manual appointments first, they have priority
        (manualAppointments || []).forEach(appt => {
          const scheduledDate = new Date(appt.scheduledDateTime);
          const key = `${appt.locationId}-${format(scheduledDate, 'yyyy-MM-dd')}`;
          appointmentsMap.set(key, appt);
        });
      
        // 2. Generate and add recurring appointments from service locations
        const daysInMonth = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
      
        (allLocations || []).forEach(location => {
          if (location.serviceDays && location.serviceDays.length > 0 && location.technicianId) {
            const serviceDaysAsNumbers = location.serviceDays.map(d => dayOfWeekMap[d]);
      
            daysInMonth.forEach(day => {
              // getDay() from date-fns returns 0 for Sunday, 1 for Monday etc. which matches our map.
              const currentDayOfWeek = getDay(day);

              if (serviceDaysAsNumbers.includes(currentDayOfWeek)) {
                const scheduledDateTime = set(day, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }); 
                const key = `${location.id}-${format(day, 'yyyy-MM-dd')}`;
      
                // Only add if no manual appointment exists for this location and day
                if (!appointmentsMap.has(key)) {
                  appointmentsMap.set(key, {
                    id: `auto-${location.id}-${format(day, 'yyyy-MM-dd')}`,
                    clientId: location.clientId,
                    locationId: location.id,
                    technicianId: location.technicianId,
                    franchiseId: location.franchiseId,
                    scheduledDateTime: scheduledDateTime.toISOString(),
                    status: 'scheduled',
                  });
                }
              }
            });
          }
        });
      
        return Array.from(appointmentsMap.values());
      }, [allLocations, manualAppointments, month, isLoadingLocations, isLoadingManualAppointments]);


      return {
        allAppointments,
        allLocations: allLocations || [],
        isLoading: isLoadingLocations || isLoadingManualAppointments,
      };
}
