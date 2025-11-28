
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Appointment, ServiceLocation, DayOfWeek } from '@/lib/types';
import { 
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  set
} from 'date-fns';

const dayOfWeekMap: Record<DayOfWeek, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};


export function useUnifiedAppointments(franchiseId: string | null | undefined, month: Date) {
    const firestore = useFirestore();

    const [allLocations, setAllLocations] = useState<ServiceLocation[]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = useState(true);

    const manualAppointmentsQuery = useMemoFirebase(() => {
        if (!firestore || !franchiseId) return null;
        return collection(firestore, 'franchises', franchiseId, 'appointments');
    }, [firestore, franchiseId]);

    const { data: manualAppointments, isLoading: isLoadingManualAppointments } = useCollection<Appointment>(manualAppointmentsQuery);

    useEffect(() => {
        if (!firestore || !franchiseId) {
            setIsLoadingLocations(false);
            return;
        };
        setIsLoadingLocations(true);
        const fetchAllLocations = async () => {
            const clientsSnapshot = await getDocs(query(collection(firestore, `franchises/${franchiseId}/clients`)));
            const locationsPromises = clientsSnapshot.docs.map(clientDoc => 
                getDocs(collection(firestore, `franchises/${franchiseId}/clients/${clientDoc.id}/locations`))
            );
            const locationsSnapshots = await Promise.all(locationsPromises);
            const allLocs: ServiceLocation[] = [];
            locationsSnapshots.forEach(locSnap => {
                locSnap.docs.forEach(doc => {
                    allLocs.push({ id: doc.id, ...doc.data() } as ServiceLocation);
                });
            });
            setAllLocations(allLocs);
            setIsLoadingLocations(false);
        }
        fetchAllLocations();
    }, [firestore, franchiseId]);

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
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        const daysInMonth = eachDayOfInterval({ start, end });
      
        (allLocations || []).forEach(location => {
          if (location.serviceDays && location.serviceDays.length > 0 && location.technicianId) {
            const serviceDaysAsNumbers = location.serviceDays.map(d => dayOfWeekMap[d]);
      
            daysInMonth.forEach(day => {
              if (serviceDaysAsNumbers.includes(getDay(day))) {
                const scheduledDateTime = set(day, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }); 
                const key = `${location.id}-${format(scheduledDateTime, 'yyyy-MM-dd')}`;
      
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
        allLocations,
        isLoading: isLoadingLocations || isLoadingManualAppointments,
      };

}
