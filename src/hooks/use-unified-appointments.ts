

'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Appointment, ServiceLocation } from '@/lib/types';
import { 
  startOfMonth,
  endOfMonth
} from 'date-fns';

// This hook now only fetches existing appointments and locations.
// The generation of recurring appointments is handled separately by a service function.
export function useUnifiedAppointments(franchiseId: string | null | undefined, month: Date) {
    const firestore = useFirestore();

    const allLocationsQuery = useMemo(() => {
        if (!firestore || !franchiseId) return null;
        return query(collection(firestore, `franchises/${franchiseId}/locations`));
    }, [firestore, franchiseId]);
    const { data: allLocations, isLoading: isLoadingLocations } = useCollection<ServiceLocation>(allLocationsQuery);

    const start = useMemo(() => startOfMonth(month), [month]);
    const end = useMemo(() => endOfMonth(month), [month]);
    
    const appointmentsQuery = useMemo(() => {
        if (!firestore || !franchiseId) return null;
        return query(
            collection(firestore, 'franchises', franchiseId, 'appointments'),
            where('scheduledDateTime', '>=', start.toISOString()),
            where('scheduledDateTime', '<=', end.toISOString())
        );
    }, [firestore, franchiseId, start, end]);

    const { data: allAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

    return {
      allAppointments: allAppointments || [],
      allLocations: allLocations || [],
      isLoading: isLoadingLocations || isLoadingAppointments,
    };
}
