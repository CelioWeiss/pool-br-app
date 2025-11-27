
"use client";

import { useMemo } from 'react';
import type { Appointment, Client, Technician } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Check, X, Calendar, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';


const AppointmentItem = ({ appointment, client, technician }: { appointment: Appointment, client?: Client, technician?: Technician }) => {

  const statusInfo = {
    scheduled: { icon: Clock, color: "bg-blue-500", label: "Agendado" },
    in_progress: { icon: PlayCircle, color: "bg-yellow-500", label: "Em Progresso" },
    completed: { icon: Check, color: "bg-green-500", label: "Concluído" },
    cancelled: { icon: X, color: "bg-red-500", label: "Cancelado" },
  };

  const currentStatus = statusInfo[appointment.status] || statusInfo.scheduled;

  // Para agendamentos recorrentes (que ainda não têm um ID real no BD)
  const isRecurring = appointment.id === 'new';
  
  const reportLink = isRecurring
    ? `/dashboard/service-report/new?clientId=${appointment.clientId}&technicianId=${appointment.technicianId}&franchiseId=${appointment.franchiseId}&scheduledDateTime=${encodeURIComponent(appointment.scheduledDateTime)}`
    : `/dashboard/service-report/${appointment.id}`;


  return (
    <div className="flex items-start gap-4 p-4 border-b last:border-b-0">
      <div className="flex flex-col items-center justify-center h-full">
         <span className="text-lg font-bold">{format(new Date(appointment.scheduledDateTime), "HH:mm")}</span>
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
            <div>
                 <Link href={`/dashboard/clients/${appointment.clientId}`} className="font-semibold hover:underline text-primary">
                  {client?.name || 'Cliente não encontrado'}
                </Link>
                <p className="text-sm text-muted-foreground">{client?.address}</p>
                <p className="text-sm text-muted-foreground">Técnico: {technician ? `${technician.firstName} ${technician.lastName}` : 'N/A'}</p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1.5 whitespace-nowrap">
                <span className={`h-2 w-2 rounded-full ${currentStatus.color}`} />
                {currentStatus.label}
            </Badge>
        </div>
      </div>
       {appointment.status === 'scheduled' && (
        <Button asChild size="sm">
            <Link href={reportLink}>
                <PlayCircle className="mr-2 h-4 w-4" />
                Iniciar Atendimento
            </Link>
        </Button>
       )}
    </div>
  );
};


export function DailySchedule({ appointments, clients, technicians }: { appointments: Appointment[], clients: Client[], technicians: Technician[] }) {
  const clientsMap = useMemo(() => new Map(clients?.map(c => [c.id, c])), [clients]);
  const techniciansMap = useMemo(() => new Map(technicians?.map(t => [t.id, t])), [technicians]);
  
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <Calendar className="h-12 w-12 mb-4" />
        <p>Nenhum atendimento para a data selecionada.</p>
      </div>
    )
  }

  const sortedAppointments = [...appointments].sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime());

  return (
    <div className="divide-y">
      {sortedAppointments.map(appt => (
        <AppointmentItem 
            key={appt.id} 
            appointment={appt} 
            client={clientsMap.get(appt.clientId)}
            technician={techniciansMap.get(appt.technicianId)}
        />
      ))}
    </div>
  );
}

    