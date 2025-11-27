
"use client";

import { useAuth } from '@/hooks/use-auth';
import { TechnicianMap } from '@/components/dashboard/map/technician-map';
import type { Client, Technician, Appointment } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';

export default function MapPage() {
  const { userInfo, hasRole } = useAuth();
  const firestore = useFirestore();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const franchiseId = userInfo?.franchiseId;

  // --- Data Fetching ---
  const techniciansCollection = useMemoFirebase(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'technicians') : null
  , [firestore, franchiseId]);
  const { data: technicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansCollection);

  const clientsCollection = useMemoFirebase(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'clients') : null
  , [firestore, franchiseId]);
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);
  
  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore || !franchiseId) return null;
    return collection(firestore, 'franchises', franchiseId, 'appointments');
  }, [firestore, franchiseId]);
  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsCollection);


  const isLoading = isLoadingTechnicians || isLoadingClients || isLoadingAppointments;

  if (!apiKey) {
    return (
      <div className="flex h-[80vh] items-center justify-center rounded-lg border bg-card text-center p-8">
        <div>
          <h2 className="text-2xl font-bold">Google Maps API Key Faltando</h2>
          <p className="mt-2 text-muted-foreground">
            Para exibir o mapa, por favor, configure a variável de ambiente <code className="font-mono bg-muted p-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.
          </p>
        </div>
      </div>
    );
  }
  
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
            clients={clients || []} 
          />
        )}
      </div>
    </div>
  );
}
