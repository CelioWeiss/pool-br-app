"use client";

import { useAuth } from '@/hooks/use-auth';
import { appointments, clients, technicians } from '@/lib/data';
import type { Appointment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, Clock, PlusCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AppointmentItem = ({ appointment }: { appointment: Appointment }) => {
  const client = clients.find(c => c.id === appointment.clientId);
  const technician = technicians.find(t => t.id === appointment.technicianId);

  const statusInfo = {
    scheduled: { icon: Clock, color: "bg-blue-500", label: "Agendado" },
    in_progress: { icon: Clock, color: "bg-yellow-500", label: "Em Progresso" },
    completed: { icon: Check, color: "bg-green-500", label: "Concluído" },
    cancelled: { icon: X, color: "bg-red-500", label: "Cancelado" },
  };

  const currentStatus = statusInfo[appointment.status];

  return (
    <div className="flex items-start gap-4 p-4 border-b last:border-b-0">
      <div className="flex flex-col items-center">
        <Calendar className="h-6 w-6 text-muted-foreground" />
        <span className="text-sm font-bold">{format(new Date(appointment.date), "dd")}</span>
        <span className="text-xs text-muted-foreground">{format(new Date(appointment.date), "MMM", { locale: ptBR })}</span>
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
            <div>
                <p className="font-semibold">{client?.name}</p>
                <p className="text-sm text-muted-foreground">{client?.address}</p>
                <p className="text-sm text-muted-foreground">Técnico: {technician?.name}</p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${currentStatus.color}`} />
                {currentStatus.label}
            </Badge>
        </div>
      </div>
      <Button variant="outline" size="sm">Detalhes</Button>
    </div>
  );
};


export default function SchedulePage() {
  const { user, hasRole } = useAuth();
  
  if (!hasRole(['owner', 'technician'])) {
    return <p>Acesso negado.</p>;
  }

  const userAppointments = appointments.filter(a => 
    hasRole('owner') ? a.franchiseId === user?.franchiseId : a.technicianId === user?.id.replace('user-', 'tech-')
  );

  const upcomingAppointments = userAppointments.filter(a => new Date(a.date) >= new Date()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pastAppointments = userAppointments.filter(a => new Date(a.date) < new Date()).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda de Serviços</h1>
          <p className="text-muted-foreground">Visualize e gerencie os agendamentos.</p>
        </div>
        {hasRole('owner') && <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximos Agendamentos</CardTitle>
            <CardDescription>Serviços agendados para os próximos dias.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map(appt => <AppointmentItem key={appt.id} appointment={appt} />)
            ) : (
                <p className="p-6 text-muted-foreground">Nenhum agendamento futuro.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
            <CardDescription>Serviços realizados anteriormente.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {pastAppointments.length > 0 ? (
                pastAppointments.map(appt => <AppointmentItem key={appt.id} appointment={appt} />)
            ) : (
                <p className="p-6 text-muted-foreground">Nenhum serviço no histórico.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
