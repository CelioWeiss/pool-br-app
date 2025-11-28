
"use client";

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Droplets, Phone, Mail, MapPin, History, Wrench, PlusCircle } from 'lucide-react';
import { AppointmentHistory } from '@/components/dashboard/client/appointment-history';
import type { Client, Technician, Appointment, ServiceLocation } from '@/lib/types';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ClientLocations } from '@/components/dashboard/clients/client-locations';
import { NewLocationForm } from '@/components/dashboard/clients/new-location-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';

const InfoCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
  <div>
    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
      <Icon className="h-4 w-4" />
      {title}
    </h3>
    <p className="text-base">{value || 'N/A'}</p>
  </div>
);


export default function ClientProfilePage({ params }: { params: { clientId: string } }) {
  const { userInfo } = useAuth();
  const firestore = useFirestore();
  const { clientId } = params;

  const franchiseId = userInfo?.franchiseId;

  // --- State for Dialog ---
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);

  // --- Data Fetching ---
  const clientDocRef = useMemoFirebase(() =>
    firestore && franchiseId && clientId ? doc(firestore, 'franchises', franchiseId, 'clients', clientId) : null,
    [firestore, franchiseId, clientId]
  );
  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientDocRef);
  
  const locationsCollectionRef = useMemoFirebase(() =>
    firestore && franchiseId && clientId ? collection(firestore, 'franchises', franchiseId, 'clients', clientId, 'locations') : null,
    [firestore, franchiseId, clientId]
  );
  const { data: locations, isLoading: isLoadingLocations } = useCollection<ServiceLocation>(locationsCollectionRef);

  const techniciansCollection = useMemoFirebase(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'technicians') : null,
    [firestore, franchiseId]
  );
  const { data: technicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansCollection);

  const appointmentsQuery = useMemoFirebase(() =>
    firestore && franchiseId && clientId ? query(collection(firestore, 'franchises', franchiseId, 'appointments'), where('clientId', '==', clientId)) : null,
    [firestore, franchiseId, clientId]
  );
  const { data: clientAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

  const isLoading = isLoadingClient || isLoadingAppointments || isLoadingTechnicians || isLoadingLocations;

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }
  
  if (!client) {
    return (
      <div className="text-center py-10">
        <p className="text-xl">Cliente não encontrado.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/clients">Voltar para a lista</Link>
        </Button>
      </div>
    );
  }

  const clientInitials = (client.name || '').split(' ').map(n => n[0]).join('').substring(0, 2);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24 border-4 border-primary">
          <AvatarFallback className="text-3xl">{clientInitials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-lg text-muted-foreground">{client.contactEmail}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoCard title="Nome de Contato" value={client.contactName} icon={User} />
              <InfoCard title="Telefone" value={client.contactPhone} icon={Phone} />
              <InfoCard title="Email" value={client.contactEmail} icon={Mail} />
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Locais de Atendimento</CardTitle>
                <CardDescription>Endereços e QR Codes</CardDescription>
              </div>
               <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="outline"><PlusCircle className="h-4 w-4"/></Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>Novo Local de Atendimento</DialogTitle>
                          <DialogDescription>Adicione um novo endereço para este cliente.</DialogDescription>
                      </DialogHeader>
                      <NewLocationForm 
                        clientId={clientId} 
                        franchiseId={franchiseId!}
                        technicians={technicians || []}
                        onSave={() => setIsLocationDialogOpen(false)}
                      />
                  </DialogContent>
               </Dialog>
            </CardHeader>
            <CardContent>
                <ClientLocations locations={locations || []} technicians={technicians || []} />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
           <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5"/>
                      Histórico de Atendimentos
                  </CardTitle>
                  <CardDescription>
                    {clientAppointments ? `Encontrado(s) ${clientAppointments.length} atendimento(s).` : 'Nenhum atendimento encontrado.'}
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <AppointmentHistory appointments={clientAppointments || []} technicians={technicians || []} />
              </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
