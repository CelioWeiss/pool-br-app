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

export default function NewServiceReportPage() {
  const { userInfo } = useAuth();
  const firestore = useFirestore();
  const searchParams = useSearchParams();

  const clientId = searchParams.get('clientId');
  const technicianId = searchParams.get('technicianId');
  const scheduledDateTime = searchParams.get('scheduledDateTime');
  const franchiseId = userInfo?.franchiseId;

  // Busca dados do cliente
  const clientDocRef = useMemoFirebase(() =>
    firestore && franchiseId && clientId ? doc(firestore, 'franchises', franchiseId, 'clients', clientId) : null,
    [firestore, franchiseId, clientId]
  );
  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientDocRef);

  // Constrói o objeto de agendamento para novos relatórios
  const appointment: Appointment | null = useMemo(() => {
    if (clientId && technicianId && scheduledDateTime && franchiseId) {
      return {
        id: 'new',
        clientId,
        technicianId,
        franchiseId,
        scheduledDateTime,
        status: 'scheduled' as const
      };
    }
    return null;
  }, [clientId, technicianId, scheduledDateTime, franchiseId]);

  const logo = PlaceHolderImages.find(p => p.id === 'logo-color');
  const isLoading = isLoadingClient;

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Spinner size="large" />
        <p className="ml-4">Carregando dados do atendimento...</p>
      </div>
    );
  }

  if (!appointment || !client) {
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
