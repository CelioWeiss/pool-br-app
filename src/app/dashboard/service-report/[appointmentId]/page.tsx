
"use client";

import React, { useMemo } from "react";
import { notFound } from "next/navigation";
import { ServiceReportForm } from "@/components/dashboard/service-report/report-form";
import Image from "next/image";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Appointment, Client, Technician } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin } from "lucide-react";

export default function ServiceReportPage({ params }: { params: { appointmentId: string } }) {
  const { userInfo, hasRole } = useAuth();
  const firestore = useFirestore();
  const { appointmentId } = params;

  const franchiseId = userInfo?.franchiseId;

  // Busca dados do agendamento
  const appointmentDocRef = useMemoFirebase(() =>
    firestore && franchiseId && appointmentId ? doc(firestore, 'franchises', franchiseId, 'appointments', appointmentId) : null,
    [firestore, franchiseId, appointmentId]
  );
  const { data: appointment, isLoading: isLoadingAppointment } = useDoc<Appointment>(appointmentDocRef);

  // Busca dados do cliente com base no agendamento
  const clientDocRef = useMemoFirebase(() =>
    firestore && franchiseId && appointment?.clientId ? doc(firestore, 'franchises', franchiseId, 'clients', appointment.clientId) : null,
    [firestore, franchiseId, appointment?.clientId]
  );
  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientDocRef);

  const techniciansCollection = useMemoFirebase(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'technicians') : null
  , [firestore, franchiseId]);
  const { data: technicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansCollection);

  const techDoc = useMemo(() => technicians?.find(t => t.userId === userInfo?.id), [technicians, userInfo?.id]);
  
  const logo = PlaceHolderImages.find(p => p.id === 'logo-color');
  const isLoading = isLoadingAppointment || isLoadingClient || isLoadingTechnicians;

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Spinner size="large" />
        <p className="ml-4">Carregando dados do atendimento...</p>
      </div>
    );
  }

  // Se não houver agendamento ou cliente, a página não foi encontrada
  if (!appointment || !client) {
    return notFound();
  }
  
  // Regras de acesso
  // 1. O técnico só pode ver o relatório de um atendimento atribuído a ele
  if (hasRole('technician') && techDoc?.id !== appointment.technicianId) {
    return (
       <div className="flex h-[80vh] items-center justify-center text-center">
         <div>
            <h1 className="text-2xl font-bold">Acesso Negado</h1>
            <p className="text-muted-foreground mt-2">Você não tem permissão para acessar este atendimento.</p>
         </div>
       </div>
    )
  }

  // 2. Se o agendamento já foi concluído, não permite edição
  if (appointment.status !== 'scheduled') {
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

      <ServiceReportForm appointment={appointment} client={client}/>
    </div>
  );
}

    