"use client";

import type { Appointment, Technician } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, X, Microscope, Wrench, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Image from 'next/image';

export function AppointmentHistory({ appointments, technicians }: { appointments: Appointment[], technicians: Technician[] }) {

  if (!appointments || appointments.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhum histórico de atendimento encontrado.</p>;
  }
  
  const sortedAppointments = [...appointments].sort((a, b) => new Date(b.scheduledDateTime).getTime() - new Date(a.scheduledDateTime).getTime());

  const statusInfo = {
    scheduled: { icon: Clock, label: "Agendado", variant: "secondary" as const, className: "" },
    in_progress: { icon: Clock, label: "Em Progresso", variant: "default" as const, className: "bg-blue-100 text-blue-800 border-blue-200" },
    completed: { icon: Check, label: "Concluído", variant: "default" as const, className: "bg-green-100 text-green-800 border-green-200" },
    cancelled: { icon: X, label: "Cancelado", variant: "destructive" as const, className: "" },
  };

  return (
    <Accordion type="single" collapsible className="w-full space-y-2">
      {sortedAppointments.map((appt) => {
        const technician = technicians.find(t => t.id === appt.technicianId);
        const currentStatus = statusInfo[appt.status] || statusInfo.scheduled;
        
        return (
          <AccordionItem value={appt.id} key={appt.id}>
            <AccordionTrigger className="p-4 bg-card hover:bg-accent rounded-lg border data-[state=open]:rounded-b-none">
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col text-left">
                  <span className="font-bold">{format(new Date(appt.scheduledDateTime), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  <span className="text-sm text-muted-foreground">Técnico: {technician?.firstName || 'N/A'}</span>
                </div>
                <Badge variant={currentStatus.variant} className={currentStatus.className}>
                  <currentStatus.icon className="mr-1 h-3 w-3" />
                  {currentStatus.label}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 border border-t-0 rounded-lg rounded-t-none bg-card">
              {appt.serviceReportId ? ( // Assuming serviceReportId points to a service report
                <p>Detalhes do relatório em breve.</p>
                // In a real implementation, you would fetch and display the service report
                // <div className="grid md:grid-cols-2 gap-6">
                //   ...
                // </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Nenhum relatório detalhado disponível para este atendimento.
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  );
}
