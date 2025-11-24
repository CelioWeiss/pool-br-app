"use client";

import { useAuth } from '@/hooks/use-auth';
import { clients, technicians, appointments } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign, Calendar, User, Wrench, History, Droplets } from 'lucide-react';
import { AppointmentHistory } from '@/components/dashboard/client/appointment-history';
import { format } from 'date-fns';

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
  const { user } = useAuth();
  
  // This is a mock association. In a real app, user.id would be linked to a client profile.
  // We're just picking a client to display their data.
  const clientData = clients.find(c => c.name.includes('Condomínio')); 
  const assignedTechnician = technicians.find(t => t.id === clientData?.assignedTechnicianId);
  const clientAppointments = appointments.filter(a => a.clientId === clientData?.id);
  const upcomingAppointment = clientAppointments
    .filter(a => new Date(a.date) >= new Date())
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  if (!user || !clientData) {
    return <p>Carregando dados do cliente...</p>;
  }

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Olá, {user.name}!</h1>
            <p className="text-muted-foreground">Bem-vindo ao seu portal do cliente.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InfoCard 
                title="Mensalidade"
                value={`R$ ${clientData.poolSize.toFixed(2)}`} // Re-using poolSize as monthlyFee
                icon={DollarSign}
            />
            <InfoCard 
                title="Vencimento"
                value={`Dia ${clientData.dueDate}`}
                icon={Calendar}
            />
             <InfoCard 
                title="Próxima Limpeza" 
                value={upcomingAppointment ? format(new Date(upcomingAppointment.date), 'dd/MM/yyyy') : 'N/A'}
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
                                    <AvatarImage src={assignedTechnician.avatarUrl} alt={assignedTechnician.name} />
                                    <AvatarFallback>{assignedTechnician.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold text-lg">{assignedTechnician.name}</p>
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
                        <AppointmentHistory appointments={clientAppointments} />
                    </CardContent>
                </Card>
            </div>
        </div>

    </div>
  );
}
