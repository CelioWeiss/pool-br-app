"use client";

import type { Appointment } from '@/lib/types';
import { technicians } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AppointmentHistory({ appointments }: { appointments: Appointment[] }) {

  if (!appointments || appointments.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhum histórico de atendimento encontrado.</p>;
  }
  
  const sortedAppointments = [...appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const statusInfo = {
    scheduled: { icon: Clock, label: "Agendado", variant: "secondary" as const },
    in_progress: { icon: Clock, label: "Em Progresso", variant: "default" as const },
    completed: { icon: Check, label: "Concluído", variant: "default" as const, className: "bg-green-100 text-green-800 border-green-200" },
    cancelled: { icon: X, label: "Cancelado", variant: "destructive" as const },
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Técnico</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedAppointments.map((appt) => {
          const technician = technicians.find(t => t.id === appt.technicianId);
          const currentStatus = statusInfo[appt.status] || statusInfo.scheduled;
          
          return (
            <TableRow key={appt.id}>
              <TableCell className="font-medium">{format(new Date(appt.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
              <TableCell>{technician?.name || 'N/A'}</TableCell>
              <TableCell>
                <Badge variant={currentStatus.variant} className={currentStatus.className}>
                  <currentStatus.icon className="mr-1 h-3 w-3" />
                  {currentStatus.label}
                </Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  );
}
