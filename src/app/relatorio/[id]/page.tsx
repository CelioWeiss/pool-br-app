
"use client";

import { useMemo, use } from 'react';
import { useParams } from "next/navigation";
import { useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ServiceReportForm } from '@/components/dashboard/service-report/report-form';
import type { Client, Appointment, ServiceLocation } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { AlertTriangle } from 'lucide-react';


export default function RelatorioPage() {
  const params = useParams();
  const firestore = useFirestore();
  const { userInfo } = useAuth();

  const appointmentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const franchiseId = userInfo?.franchiseId;

  const appointmentDocRef = useMemo(() =>
    (firestore && franchiseId && appointmentId) ? doc(firestore, `franchises/${franchiseId}/appointments`, appointmentId) : null
  , [firestore, franchiseId, appointmentId]);

  const { data: appointment, isLoading: isLoadingAppointment } = useDoc<Appointment>(appointmentDocRef);
  
  const clientId = appointment?.clientId;
  const locationId = appointment?.locationId;
  
  const clientDocRef = useMemo(() => 
      (firestore && franchiseId && clientId) ? doc(firestore, `franchises/${franchiseId}/clients`, clientId) : null
  , [firestore, franchiseId, clientId]);
  
  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientDocRef);

  const locationDocRef = useMemo(() =>
    (firestore && franchiseId && locationId) ? doc(firestore, `franchises/${franchiseId}/locations`, locationId) : null
  , [firestore, franchiseId, locationId]);

  const { data: location, isLoading: isLoadingLocation } = useDoc<ServiceLocation>(locationDocRef);

  const isLoading = isLoadingAppointment || isLoadingClient || isLoadingLocation;

  if (isLoading) {
      return (
          <div className="flex h-[80vh] items-center justify-center">
            <Spinner size="large" />
            <p className="ml-4">Carregando dados do atendimento...</p>
          </div>
      );
  }

  if (!appointment || !client || !location) {
      return (
           <div className="flex h-[80vh] items-center justify-center">
            <Card className="max-w-md text-center">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2"><AlertTriangle className="text-destructive"/> Atendimento Não Encontrado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Não foi possível carregar os dados completos do atendimento (agendamento, cliente ou local). Verifique o ID e tente novamente.</p>
                </CardContent>
            </Card>
           </div>
      )
  }


  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Relatório de Atendimento</h1>
        <p className="text-muted-foreground text-lg">Cliente: <span className="font-semibold">{client.name}</span></p>
         <p className="text-muted-foreground">Endereço: <span className="font-semibold">{location.address}</span></p>
      </div>

      <ServiceReportForm appointment={appointment} client={client} location={location} />
    </div>
  );
}
