
"use client";

import { ServiceReportForm } from "@/components/dashboard/service-report/report-form";
import Image from "next/image";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { notFound } from "next/navigation";
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Appointment, Client } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, MapPin } from "lucide-react";


export default function ServiceReportPage({ params }: { params: { appointmentId: string } }) {
  const { userInfo } = useAuth();
  const firestore = useFirestore();
  const { appointmentId } = params;

  const franchiseId = userInfo?.franchiseId;

  // Fetch Appointment Data
  const appointmentDocRef = useMemoFirebase(() =>
    firestore && franchiseId && appointmentId ? doc(firestore, 'franchises', franchiseId, 'appointments', appointmentId) : null,
    [firestore, franchiseId, appointmentId]
  );
  const { data: appointment, isLoading: isLoadingAppointment } = useDoc<Appointment>(appointmentDocRef);

  const clientId = appointment?.clientId;

  // Fetch Client Data based on appointment
  const clientDocRef = useMemoFirebase(() =>
    firestore && franchiseId && clientId ? doc(firestore, 'franchises', franchiseId, 'clients', clientId) : null,
    [firestore, franchiseId, clientId]
  );
  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientDocRef);


  const logo = PlaceHolderImages.find(p => p.id === 'logo-color');

  const isLoading = isLoadingAppointment || isLoadingClient;

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Spinner size="large" />
        <p className="ml-4">Carregando dados do atendimento...</p>
      </div>
    );
  }

  if (!appointment || !client) {
    // Or a more user-friendly "not found" component
    return notFound();
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
       <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatório de Serviço</h1>
            <p className="text-muted-foreground">Preencha os detalhes do serviço para o cliente <span className="font-semibold text-primary">{client.name}</span>.</p>
          </div>
          {logo && (
            <Image
              src={logo.imageUrl}
              alt="Logo da Empresa"
              width={120}
              height={60}
              className="object-contain"
              data-ai-logo
            />
          )}
        </div>
        
        <Card className="bg-secondary">
          <CardHeader>
            <CardTitle>Detalhes do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground"/>
              <span className="font-medium">{client.contactName}</span>
            </div>
             <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground"/>
              <span className="font-medium">{client.address}</span>
            </div>
          </CardContent>
        </Card>

      <ServiceReportForm appointment={appointment} client={client}/>
    </div>
  );
}

    