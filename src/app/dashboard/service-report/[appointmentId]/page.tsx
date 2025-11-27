
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

  // Para agendamentos recorrentes, o ID será 'new' e os dados vêm dos searchParams
  const isNewRecurringAppointment = appointmentId === 'new';

  const clientIdFromParams = searchParams.get('clientId');
  const technicianIdFromParams = searchParams.get('technicianId');
  const scheduledDateTimeFromParams = searchParams.get('scheduledDateTime');

  const franchiseId = userInfo?.franchiseId;

  // --- Busca de Dados ---

  // Busca dados do agendamento se for um pré-existente do BD
  const appointmentDocRef = useMemoFirebase(() =>
    !isNewRecurringAppointment && firestore && franchiseId && appointmentId ? doc(firestore, 'franchises', franchiseId, 'appointments', appointmentId) : null,
    [firestore, franchiseId, appointmentId, isNewRecurringAppointment]
  );
  const { data: appointment, isLoading: isLoadingAppointment } = useDoc<Appointment>(appointmentDocRef);

  // Determina o ID do cliente a ser buscado: da URL para novo recorrente, do documento do BD para existente
  const finalClientId = isNewRecurringAppointment ? clientIdFromParams : appointment?.clientId;
  
  // Busca dados do cliente com base no ID do cliente determinado
  const clientDocRef = useMemoFirebase(() =>
    firestore && franchiseId && finalClientId ? doc(firestore, 'franchises', franchiseId, 'clients', finalClientId) : null,
    [firestore, franchiseId, finalClientId]
  );
  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientDocRef);
  
  // Constrói o objeto de agendamento final para o formulário
  // É o do BD ou um temporário para novos agendamentos recorrentes
  const finalAppointment: Appointment | null = useMemo(() => {
    if (isNewRecurringAppointment && clientIdFromParams && technicianIdFromParams && scheduledDateTimeFromParams && franchiseId) {
      return {
        id: 'new', // Um ID genérico para indicar que é um novo relatório
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

  // Se não tivermos um objeto de agendamento final ou um cliente, algo está errado.
  if (!finalAppointment || !client) {
    return notFound();
  }
  
  // Se o agendamento do BD já estiver concluído, bloqueia a edição.
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
