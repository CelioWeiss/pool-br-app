
"use client";

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign, Calendar, User, Wrench, History, Droplets, Copy, MapPin } from 'lucide-react';
import { AppointmentHistory } from '@/components/dashboard/client/appointment-history';
import { format, getDay, addDays, isFuture } from 'date-fns';
import type { Client, Technician, Appointment, Franchise, UserInfo, ServiceLocation } from '@/lib/types';
import { useMemo } from 'react';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { collection, doc, query, where, getDocs, limit } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const InfoCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
);

const PixCard = ({ pixKey }: { pixKey: string }) => {
  const { toast } = useToast();
  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixKey);
    toast({
      title: 'Chave PIX Copiada!',
      description: 'Você pode colar a chave no seu aplicativo de banco.',
    });
  }

  return (
    <Card className="bg-primary/5">
       <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <DollarSign className="h-5 w-5" /> Informações de Pagamento
          </CardTitle>
      </CardHeader>
      <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Use a chave PIX abaixo para realizar o pagamento da sua mensalidade.
          </p>
          <div className="flex items-center gap-2 p-3 bg-background border rounded-md">
            <p className="font-mono text-sm font-semibold truncate flex-1">{pixKey}</p>
            <Button variant="ghost" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4"/>
            </Button>
          </div>
      </CardContent>
    </Card>
  )
}

const dayOfWeekMap: { [key: string]: number } = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};


export function ClientDashboard() {
  const { user, userInfo } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const franchiseId = userInfo?.franchiseId;

  // Find the client document using the user's ID
  const clientQuery = useMemo(() => 
    firestore && franchiseId && user ? query(collection(firestore, `franchises/${franchiseId}/clients`), where('userId', '==', user.uid), limit(1)) : null, 
  [firestore, franchiseId, user]);
  
  const { data: clientQueryResult, isLoading: isLoadingClient } = useCollection<Client>(clientQuery);
  const clientData = useMemo(() => clientQueryResult?.[0], [clientQueryResult]);
  const clientId = clientData?.id;

  // Find the service locations for this client
  const locationsQuery = useMemo(() =>
    firestore && franchiseId && clientId ? query(collection(firestore, `franchises/${franchiseId}/locations`), where('clientId', '==', clientId)) : null,
  [firestore, franchiseId, clientId]);
  const { data: locations, isLoading: isLoadingLocations } = useCollection<ServiceLocation>(locationsQuery);
  const primaryLocation = useMemo(() => locations?.[0], [locations]);

  const franchiseDocRef = useMemo(() => 
    firestore && franchiseId ? doc(firestore, 'franchises', franchiseId) : null,
  [firestore, franchiseId]);
  const { data: franchise, isLoading: isLoadingFranchise } = useDoc<Franchise>(franchiseDocRef);

  const techniciansCollectionRef = useMemo(() => 
    firestore && franchiseId ? collection(firestore, `franchises/${franchiseId}/technicians`) : null,
  [firestore, franchiseId]);
  const { data: technicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansCollectionRef);

  const appointmentsQuery = useMemo(() => 
    firestore && franchiseId && clientId ? query(collection(firestore, `franchises/${franchiseId}/appointments`), where('clientId', '==', clientId)) : null,
  [firestore, franchiseId, clientId]);
  const { data: clientAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

  
  const upcomingAppointment = useMemo(() => {
    if (!clientAppointments) return null;
    return clientAppointments
      .filter(a => new Date(a.scheduledDateTime) >= new Date() && (a.status === 'scheduled' || a.status === 'in_progress'))
      .sort((a,b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime())[0];
  }, [clientAppointments]);

  const nextCleaningDate = useMemo(() => {
    if (upcomingAppointment) {
      return format(new Date(upcomingAppointment.scheduledDateTime), 'dd/MM/yyyy');
    }
    
    if (primaryLocation && primaryLocation.serviceDays.length > 0) {
      const today = new Date();
      const todayDayOfWeek = getDay(today); // Sunday is 0

      const serviceDaysAsNumbers = primaryLocation.serviceDays.map(day => dayOfWeekMap[day]).sort();

      for (let i = 0; i < 7; i++) {
        const nextDate = addDays(today, i);
        if (serviceDaysAsNumbers.includes(getDay(nextDate))) {
          if (isFuture(nextDate) || i === 0) { // If today is a service day, or it's in the future
            return format(nextDate, 'dd/MM/yyyy');
          }
        }
      }
    }

    return 'N/A';
  }, [upcomingAppointment, primaryLocation]);


  const completedAppointments = useMemo(() => {
    if (!clientAppointments) return [];
    return clientAppointments.filter(a => a.status === 'completed');
  }, [clientAppointments]);
  
  const assignedTechnician = useMemo(() => {
    if (!primaryLocation?.technicianId || !technicians) return undefined;
    return technicians.find(t => t.id === primaryLocation.technicianId);
  }, [primaryLocation, technicians]);

  // Get User profile for the assigned technician to get the avatar
  const techUserDocRef = useMemo(() =>
    firestore && assignedTechnician?.userId ? doc(firestore, 'users', assignedTechnician.userId) : null
  , [firestore, assignedTechnician]);
  const { data: techUserInfo, isLoading: isLoadingTechUser } = useDoc<UserInfo>(techUserDocRef);


  const isLoading = isLoadingClient || isLoadingFranchise || isLoadingTechnicians || isLoadingAppointments || isLoadingTechUser || isLoadingLocations;

  if (isLoading) {
      return <div className="flex h-[80vh] items-center justify-center"><Spinner size="large" /></div>
  }

  if (!userInfo || !clientData) {
    return <p>Carregando dados do cliente...</p>;
  }

  const clientName = clientData?.name || userInfo.firstName;
  const clientInitials = (clientName || '').split(' ').map(n => n[0]).join('').substring(0, 2);

  return (
    <div className="space-y-8">
        <div className="flex items-center gap-4">
           <Avatar className="h-16 w-16 border">
              <AvatarImage src={userInfo.avatarUrl} alt={clientName} />
              <AvatarFallback className="text-xl">{clientInitials}</AvatarFallback>
            </Avatar>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Olá, {clientName}!</h1>
                <p className="text-muted-foreground">Bem-vindo ao seu portal do cliente.</p>
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InfoCard 
                title="Mensalidade"
                value={clientData?.monthlyFee ? clientData.monthlyFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A'}
                icon={DollarSign}
            />
            <InfoCard 
                title="Vencimento"
                value={clientData?.dueDay ? `Dia ${clientData.dueDay}`: 'N/A'}
                icon={Calendar}
            />
             <InfoCard 
                title="Próxima Limpeza" 
                value={nextCleaningDate}
                icon={Droplets} 
            />
             <InfoCard 
                title="Qualidade da Água" 
                value="Excelente" 
                icon={Wrench} 
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
                {franchise?.pixKey && (
                   <PixCard pixKey={franchise.pixKey} />
                )}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <User className="h-5 w-5" /> Técnico Responsável
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {assignedTechnician ? (
                             <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={techUserInfo?.avatarUrl} alt={assignedTechnician.firstName} />
                                    <AvatarFallback>{assignedTechnician.firstName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold text-lg">{assignedTechnician.firstName} {assignedTechnician.lastName}</p>
                                    <p className="text-sm text-muted-foreground">{assignedTechnician.phone}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">Nenhum técnico atribuído a este local.</p>
                        )}
                        {primaryLocation && (
                            <div className="text-sm text-muted-foreground mt-4 pt-4 border-t">
                                <p className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" /> Local de Atendimento:</p>
                                <p>{primaryLocation.address}</p>
                            </div>
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
                        <AppointmentHistory appointments={completedAppointments} technicians={technicians || []} />
                    </CardContent>
                </Card>
            </div>
        </div>

    </div>
  );
}
