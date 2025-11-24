"use client";

import type { Appointment } from '@/lib/types';
import { technicians, PlaceHolderImages } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, X, Microscope, Wrench, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';

export function AppointmentHistory({ appointments }: { appointments: Appointment[] }) {

  if (!appointments || appointments.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhum histórico de atendimento encontrado.</p>;
  }
  
  const sortedAppointments = [...appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const statusInfo = {
    scheduled: { icon: Clock, label: "Agendado", variant: "secondary" as const, className: "" },
    in_progress: { icon: Clock, label: "Em Progresso", variant: "default" as const, className: "bg-blue-100 text-blue-800 border-blue-200" },
    completed: { icon: Check, label: "Concluído", variant: "default" as const, className: "bg-green-100 text-green-800 border-green-200" },
    cancelled: { icon: X, label: "Cancelado", variant: "destructive" as const, className: "" },
  };

  const poolPhoto = PlaceHolderImages.find(p => p.id === 'pool-photo-1');

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
                  <span className="font-bold">{format(new Date(appt.date), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  <span className="text-sm text-muted-foreground">Técnico: {technician?.name || 'N/A'}</span>
                </div>
                <Badge variant={currentStatus.variant} className={currentStatus.className}>
                  <currentStatus.icon className="mr-1 h-3 w-3" />
                  {currentStatus.label}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 border border-t-0 rounded-lg rounded-t-none bg-card">
              {appt.serviceReport ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2"><Microscope className="w-4 h-4 text-primary" /> Parâmetros</h4>
                      <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
                        <li>Cloro: {appt.serviceReport.chlorineLevel} ppm</li>
                        <li>pH: {appt.serviceReport.phLevel}</li>
                        <li>Alcalinidade: {appt.serviceReport.alcalinity} ppm</li>
                      </ul>
                    </div>
                     <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2"><Wrench className="w-4 h-4 text-primary" /> Serviços Realizados</h4>
                      <p className="text-muted-foreground text-sm">{appt.serviceReport.servicesPerformed.join(', ')}.</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2"><ImageIcon className="w-4 h-4 text-primary" /> Foto do Atendimento</h4>
                    {poolPhoto && (
                      <Image 
                        src={appt.serviceReport.photoUrl} 
                        alt="Foto da piscina" 
                        width={600} 
                        height={400} 
                        className="rounded-md object-cover aspect-video w-full"
                      />
                    )}
                  </div>
                </div>
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
