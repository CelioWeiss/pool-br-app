
"use client";

import { useAuth } from '@/hooks/use-auth';
import { TechnicianMap } from '@/components/dashboard/map/technician-map';
import type { Client, Technician, Appointment, ServiceLocation } from '@/lib/types';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { useMemo } from 'react';

export default function MapPage() {
  const { userInfo, hasRole } = useAuth();
  const firestore = useFirestore();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const franchiseId = userInfo?.franchiseId;

  // --- Data Fetching ---
  const techniciansCollection = useMemo(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'technicians') : null
  , [firestore, franchiseId]);
  const { data: technicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansCollection);

  const locationsCollection = useMemo(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'locations') : null
  , [firestore, franchiseId]);
  const { data: locations, isLoading: isLoadingLocations } = useCollection<ServiceLocation>(locationsCollection);
  
  const appointmentsCollection = useMemo(() => {
    if (!firestore || !franchiseId) return null;
    return collection(firestore, 'franchises', franchiseId, 'appointments');
  }, [firestore, franchiseId]);
  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsCollection);


  const isLoading = isLoadingTechnicians || isLoadingLocations || isLoadingAppointments;

  if (!hasRole(['owner', 'master'])) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p>Acesso negado.</p>
      </div>
    )
  }

  return (
    <div>
       <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Mapa de Técnicos</h1>
          <p className="text-muted-foreground">Acompanhe a localização dos técnicos em tempo real.</p>
        </div>
      <div className="h-[75vh] w-full overflow-hidden rounded-xl shadow-lg">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="large" />
            <p className="ml-4">Carregando dados do mapa...</p>
          </div>
        ) : (
          <TechnicianMap 
            apiKey={apiKey} 
            technicians={technicians || []} 
            appointments={appointments || []} 
            locations={locations || []} 
          />
        )}
      </div>
    </div>
  );
}
