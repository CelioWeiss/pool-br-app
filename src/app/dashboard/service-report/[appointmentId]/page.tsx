
"use client";

import React, { useMemo } from "react";
import { useSearchParams, notFound } from "next/navigation";
import { ServiceReportForm } from "@/components/dashboard/service-report/report-form";
import Image from "next/image";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Appointment, Client } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin } from "lucide-react";

export default function ServiceReportPage({ params }: { params: { appointmentId: string } }) {
  const { userInfo } = useAuth();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const { appointmentId } = params;

  // For recurring appointments, the ID will be 'new' and data comes from searchParams
  const isNewRecurringAppointment = appointmentId === 'new';

  const clientIdFromParams = searchParams.get('clientId');
  const technicianIdFromParams = searchParams.get('technicianId');
  const scheduledDateTimeFromParams = searchParams.get('scheduledDateTime');

  const franchiseId = userInfo?.franchiseId;

  // --- Data Fetching ---

  // Fetch Appointment Data if it's a pre-existing one from the DB
  const appointmentDocRef = useMemoFirebase(() =>
    !isNewRecurringAppointment && firestore && franchiseId && appointmentId ? doc(firestore, 'franchises', franchiseId, 'appointments', appointmentId) : null,
    [firestore, franchiseId, appointmentId, isNewRecurringAppointment]
  );
  const { data: appointment, isLoading: isLoadingAppointment } = useDoc<Appointment>(appointmentDocRef);

  // Determine the client ID to fetch: from URL for new recurring, from DB doc for existing
  const finalClientId = isNewRecurringAppointment ? clientIdFromParams : appointment?.clientId;
  
  // Fetch Client Data based on the determined client ID
  const clientDocRef = useMemoFirebase(() =>
    firestore && franchiseId && finalClientId ? doc(firestore, 'franchises', franchiseId, 'clients', finalClientId) : null,
    [firestore, franchiseId, finalClientId]
  );
  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientDocRef);
  
  // Construct the final appointment object for the form
  // It's either the one from DB or a temporary one for new recurring appointments
  const finalAppointment: Appointment | null = useMemo(() => {
    if (isNewRecurringAppointment && clientIdFromParams && technicianIdFromParams && scheduledDateTimeFromParams && franchiseId) {
      return {
        id: `auto-${clientIdFromParams}-${new Date(scheduledDateTimeFromParams).getTime()}`, // A temporary, unique ID
        clientId: clientIdFromParams,
        technicianId: technicianIdFromParams,
        franchiseId,
        scheduledDateTime: scheduledDateTimeFromParams,
        status: 'scheduled' as const
      };
    }
    return appointment || null;
  }, [isNewRecurringAppointment, clientIdFromParams, technicianIdFromParams, scheduledDateTimeFromParams, franchiseId, appointment]);

  const logo = PlaceHolderImages.find(p => p.id === 'logo-color');
  const isLoading = (isLoadingAppointment && !isNewRecurringAppointment) || isLoadingClient;

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Spinner size="large" />
        <p className="ml-4">Carregando dados do atendimento...</p>
      </div>
    );
  }

  // If we don't have a final appointment object or a client, something is wrong.
  if (!finalAppointment || !client) {
    return notFound();
  }
  
  // If the appointment from the DB is already completed, block editing.
  if (finalAppointment.status !== 'scheduled') {
    return (
       <div className="flex h-[80vh] items-center justify-center text-center">
         <div>
            <h1 className="text-2xl font-bold">Atendimento não disponível</h1>
            <p className="text-muted-foreground mt-2">Este atendimento já foi concluído ou cancelado e não pode mais ser editado.</p>
         </div>
       </div>
    )
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

      <ServiceReportForm appointment={finalAppointment} client={client}/>
    </div>
  );
}
