
"use client";

import React from "react";
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Phone, Mail, History, PlusCircle, AlertTriangle, Clock } from 'lucide-react';
import { AppointmentHistory } from '@/components/dashboard/client/appointment-history';
import type { Client, Technician, Appointment, ServiceLocation } from '@/lib/types';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { ClientLocations } from '@/components/dashboard/clients/client-locations';
import { NewLocationForm } from '@/components/dashboard/clients/new-location-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Accordion } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


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
  const { clientId } = React.use(params);
  const { userInfo } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const franchiseId = userInfo?.franchiseId;

  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [locationToDeactivate, setLocationToDeactivate] = useState<ServiceLocation | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<ServiceLocation | null>(null);

  const clientDocRef = useMemo(() =>
    firestore && franchiseId && clientId ? doc(firestore, 'franchises', franchiseId, 'clients', clientId) : null,
    [firestore, franchiseId, clientId]
  );
  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientDocRef);
  
  const locationsCollectionRef = useMemo(() =>
    firestore && franchiseId && clientId ? query(collection(firestore, 'franchises', franchiseId, 'locations'), where('clientId', '==', clientId)) : null,
    [firestore, franchiseId, clientId]
  );
  const { data: locations, isLoading: isLoadingLocations } = useCollection<ServiceLocation>(locationsCollectionRef);

  const techniciansCollection = useMemo(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'technicians') : null,
    [firestore, franchiseId]
  );
  const { data: technicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansCollection);

  const appointmentsQuery = useMemo(() =>
    firestore && franchiseId && clientId ? query(collection(firestore, 'franchises', franchiseId, 'appointments'), where('clientId', '==', clientId)) : null,
    [firestore, franchiseId, clientId]
  );
  const { data: clientAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

  const { pendingAppointments, completedAppointments } = React.useMemo(() => {
    const allAppointments = clientAppointments || [];
    
    const pending = allAppointments
      .filter(appt => appt.status === 'scheduled' || appt.status === 'in_progress')
      .sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime());

    const completed = allAppointments
      .filter(appt => appt.status === 'completed' || appt.status === 'cancelled')
      .sort((a, b) => new Date(b.scheduledDateTime).getTime() - new Date(a.scheduledDateTime).getTime());
      
    return { pendingAppointments: pending, completedAppointments: completed };
  }, [clientAppointments]);

  const handleToggleLocationStatus = async () => {
    if (!locationToDeactivate || !firestore || !franchiseId) return;

    const locationRef = doc(firestore, 'franchises', franchiseId, 'locations', locationToDeactivate.id);
    const newStatus = locationToDeactivate.isActive === false ? true : false;
    
    try {
        await updateDoc(locationRef, { isActive: newStatus });
        toast({
            title: `Local ${newStatus ? 'Ativado' : 'Inativado'}!`,
            description: `O endereço foi marcado como ${newStatus ? 'ativo' : 'inativo'}.`,
        });
    } catch (error) {
        console.error("Error toggling location status: ", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível alterar o status do local." });
    } finally {
        setLocationToDeactivate(null);
    }
  };
  
  const handleDeleteLocation = async () => {
      if (!locationToDelete || !firestore || !franchiseId) return;
      
      const locationRef = doc(firestore, 'franchises', franchiseId, 'locations', locationToDelete.id);
      
      try {
          await deleteDoc(locationRef);
          toast({
              title: "Local Excluído!",
              description: `O endereço foi removido com sucesso.`,
          });
      } catch (error) {
          console.error("Error deleting location: ", error);
          toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir o endereço." });
      } finally {
          setLocationToDelete(null);
      }
  };


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
    <>
      <div className="space-y-8">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24 border-4 border-primary">
            <AvatarImage src={client.avatarUrl} alt={client.name} />
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
                          onCancel={() => setIsLocationDialogOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                  <ClientLocations 
                    locations={locations || []} 
                    technicians={technicians || []} 
                    onToggleStatus={setLocationToDeactivate}
                    onDelete={setLocationToDelete}
                  />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5"/>
                        Histórico de Atendimentos
                    </CardTitle>
                    <CardDescription>
                      {completedAppointments.length > 0 ? `Exibindo os últimos ${completedAppointments.length} atendimento(s) concluído(s).` : 'Nenhum atendimento no histórico.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AppointmentHistory appointments={completedAppointments} technicians={technicians || []} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5"/>
                        Próximos Atendimentos
                    </CardTitle>
                    <CardDescription>
                      {pendingAppointments.length > 0 ? `Exibindo os próximos ${pendingAppointments.length} atendimento(s) pendente(s).` : 'Nenhum atendimento pendente.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AppointmentHistory appointments={pendingAppointments} technicians={technicians || []} />
                </CardContent>
              </Card>
          </div>
        </div>
      </div>

       <AlertDialog open={!!locationToDeactivate} onOpenChange={(open) => !open && setLocationToDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{locationToDeactivate?.isActive === false ? 'Ativar' : 'Inativar'} Local?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marcará o endereço <span className="font-bold">{locationToDeactivate?.address}</span> como {locationToDeactivate?.isActive === false ? 'ativo' : 'inativo'}. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLocationToDeactivate(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleLocationStatus} className={locationToDeactivate?.isActive !== false ? buttonVariants({ variant: "destructive" }) : ''}>
                {locationToDeactivate?.isActive === false ? 'Ativar' : 'Inativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={!!locationToDelete} onOpenChange={(open) => !open && setLocationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Local?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita e excluirá permanentemente o endereço <span className="font-bold">{locationToDelete?.address}</span>. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLocationToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLocation} className={buttonVariants({ variant: "destructive" })}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
