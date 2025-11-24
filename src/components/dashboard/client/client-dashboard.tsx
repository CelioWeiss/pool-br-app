"use client";

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign, Calendar, User, Wrench, History, Droplets } from 'lucide-react';
import { AppointmentHistory } from '@/components/dashboard/client/appointment-history';
import { format } from 'date-fns';
import type { Client, Technician, Appointment } from '@/lib/types';
import { useMemo } from 'react';
import { clients, technicians, appointments } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';


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

export function ClientDashboard() {
  const { userInfo } = useAuth();

  const clientData: Client | undefined = useMemo(() => clients.find(c => c.id === userInfo?.id), [userInfo]);

  const assignedTechnician: Technician | undefined = useMemo(() => {
    if (!clientData?.technicianId) return undefined;
    return technicians.find(t => t.id === clientData.technicianId);
  }, [clientData]);

  const clientAppointments: Appointment[] = useMemo(() => {
      if (!clientData) return [];
      return appointments.filter(a => a.clientId === clientData.id);
  }, [clientData]);

  const upcomingAppointment = useMemo(() => {
    if (!clientAppointments) return null;
    return clientAppointments
      .filter(a => new Date(a.scheduledDateTime) >= new Date())
      .sort((a,b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime())[0];
  }, [clientAppointments]);

  if (!userInfo || !clientData) {
    return <p>Carregando dados do cliente...</p>;
  }

  const getAvatarUrl = (id: string) => {
    const placeholder = PlaceHolderImages.find(p => p.id === id);
    return placeholder?.imageUrl;
  }

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Olá, {clientData?.name || userInfo.firstName}!</h1>
            <p className="text-muted-foreground">Bem-vindo ao seu portal do cliente.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InfoCard 
                title="Mensalidade"
                value={clientData?.poolDetails?.includes('50.000L') ? 'R$ 450' : 'R$ 300'}
                icon={DollarSign}
            />
            <InfoCard 
                title="Vencimento"
                value={`Dia 10`}
                icon={Calendar}
            />
             <InfoCard 
                title="Próxima Limpeza" 
                value={upcomingAppointment ? format(new Date(upcomingAppointment.scheduledDateTime), 'dd/MM/yyyy') : 'N/A'}
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
                                    <AvatarImage src={getAvatarUrl(assignedTechnician.id)} alt={assignedTechnician.firstName} />
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
                        <AppointmentHistory appointments={clientAppointments} technicians={technicians} />
                    </CardContent>
                </Card>
            </div>
        </div>

    </div>
  );
}
