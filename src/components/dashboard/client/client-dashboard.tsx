"use client";

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign, Calendar, User, Wrench, History, Droplets } from 'lucide-react';
import { AppointmentHistory } from '@/components/dashboard/client/appointment-history';
import { format } from 'date-fns';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Client, Technician, Appointment } from '@/lib/types';
import { useMemo } from 'react';

const InfoCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: string | number, icon: React.ElementType, isLoading?: boolean }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
         {isLoading ? <div className="h-8 w-1/2 animate-pulse bg-muted rounded-md" /> : <div className="text-2xl font-bold">{value}</div>}
      </CardContent>
    </Card>
);

export function ClientDashboard() {
  const { userInfo } = useAuth();
  const firestore = useFirestore();

  // The client ID is the user's own ID in this data model.
  const clientId = userInfo?.id;
  const franchiseId = userInfo?.franchiseId;

  const clientDocRef = useMemoFirebase(() => {
    if (!franchiseId || !clientId) return null;
    return doc(firestore, 'franchises', franchiseId, 'clients', clientId);
  }, [firestore, franchiseId, clientId]);
  const { data: clientData, isLoading: isLoadingClient } = useDoc<Client>(clientDocRef);

  const technicianDocRef = useMemoFirebase(() => {
    if (!franchiseId || !clientData?.technicianId) return null;
    return doc(firestore, 'franchises', franchiseId, 'technicians', clientData.technicianId);
  }, [firestore, franchiseId, clientData?.technicianId]);
  const { data: assignedTechnician, isLoading: isLoadingTechnician } = useDoc<Technician>(technicianDocRef);

  const appointmentsQuery = useMemoFirebase(() => {
    if (!franchiseId || !clientId) return null;
    return query(collection(firestore, 'franchises', franchiseId, 'appointments'), where('clientId', '==', clientId));
  }, [firestore, franchiseId, clientId]);
  const { data: clientAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

  const allTechniciansQuery = useMemoFirebase(() => {
      if (!franchiseId) return null;
      return collection(firestore, 'franchises', franchiseId, 'technicians');
  }, [firestore, franchiseId]);
  const { data: allTechnicians, isLoading: isLoadingAllTechnicians } = useCollection<Technician>(allTechniciansQuery);


  const upcomingAppointment = useMemo(() => {
    if (!clientAppointments) return null;
    return clientAppointments
      .filter(a => new Date(a.scheduledDateTime) >= new Date())
      .sort((a,b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime())[0];
  }, [clientAppointments]);
  
  const isLoading = isLoadingClient || isLoadingTechnician || isLoadingAppointments || isLoadingAllTechnicians;

  if (!userInfo) {
    return <p>Carregando dados do cliente...</p>;
  }

  // A temporary mapping for avatar images, since this is not in our data model.
  const avatarMap: { [key: string]: string } = {
    'Bruno Alves': 'https://images.unsplash.com/photo-1725866546799-4cc16f6cba23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxtYW4lMjBzbWlsaW5nfGVufDB8fHx8fDE3NjM5NzI3MTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'Carlos Dias': 'https://images.unsplash.com/photo-1522556189639-b150ed9c4330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxtYW4lMjBwb3J0cmFpdHxlbnwwfHx8fDE3NjM5MjU3NzF8MA&ixlib=rb-4.1.0&q=80&w=1080',
  };

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Olá, {clientData?.name || userInfo.firstName}!</h1>
            <p className="text-muted-foreground">Bem-vindo ao seu portal do cliente.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InfoCard 
                title="Mensalidade"
                value={clientData?.poolDetails || 'N/A'} // This needs a proper field in the model
                icon={DollarSign}
                isLoading={isLoading}
            />
            <InfoCard 
                title="Vencimento"
                value={`Dia 10`} // This needs a proper field in the model
                icon={Calendar}
                 isLoading={isLoading}
            />
             <InfoCard 
                title="Próxima Limpeza" 
                value={upcomingAppointment ? format(new Date(upcomingAppointment.scheduledDateTime), 'dd/MM/yyyy') : 'N/A'}
                icon={Droplets} 
                 isLoading={isLoading}
            />
             <InfoCard 
                title="Qualidade da Água" 
                value="Excelente" 
                icon={Wrench} 
                isLoading={isLoading}
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <User className="h-5 w-5" /> Técnico Responsável
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingTechnician && <p>Carregando...</p>}
                        {!isLoadingTechnician && assignedTechnician ? (
                             <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={avatarMap[assignedTechnician.firstName + ' ' + assignedTechnician.lastName]} alt={assignedTechnician.firstName} />
                                    <AvatarFallback>{assignedTechnician.firstName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold text-lg">{assignedTechnician.firstName} {assignedTechnician.lastName}</p>
                                    <p className="text-sm text-muted-foreground">{assignedTechnician.phone}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">Nenhum técnico atribuído.</p>
                        )}
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
                    </CardHeader>
                    <CardContent>
                        <AppointmentHistory appointments={clientAppointments || []} technicians={allTechnicians || []} />
                    </CardContent>
                </Card>
            </div>
        </div>

    </div>
  );
}
