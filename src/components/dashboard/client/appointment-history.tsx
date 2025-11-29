
"use client";

import type { Appointment, Technician, ServiceReport } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, X, Microscope, Wrench, Image as ImageIcon, Droplets, ListChecks, Package, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Image from 'next/image';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

const ReportDetailCard = ({ title, icon, children, className }: { title: string, icon: React.ReactNode, children: React.ReactNode, className?: string }) => (
    <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
        <div className="p-4">
            <h3 className="text-base font-semibold flex items-center gap-2 text-muted-foreground">
                {icon}
                {title}
            </h3>
            <div className="pt-2">
                {children}
            </div>
        </div>
    </div>
);


const ServiceReportDetails = ({ report }: { report: ServiceReport }) => {
    
    const parameters = [
        { label: "Cloro", value: report.chlorine, unit: "ppm" },
        { label: "pH", value: report.ph, unit: "" },
        { label: "Alcalinidade", value: report.alkalinity, unit: "ppm" },
        { label: "Ác. Cianúrico", value: report.cya, unit: "ppm" },
        { label: "Dureza Cálcica", value: report.calciumHardness, unit: "ppm" },
    ];

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ReportDetailCard title="Parâmetros da Água" icon={<Droplets className="h-4 w-4" />}>
                     <ul className="space-y-1 text-sm">
                        {parameters.map(p => (
                            <li key={p.label} className="flex justify-between">
                                <span className="text-muted-foreground">{p.label}:</span>
                                <span className="font-mono">{p.value} {p.unit}</span>
                            </li>
                        ))}
                    </ul>
                </ReportDetailCard>
                 <ReportDetailCard title="Serviços Realizados" icon={<ListChecks className="h-4 w-4" />}>
                     <ul className="space-y-1 text-sm list-disc list-inside">
                        {report.servicesPerformed.map(s => <li key={s}>{s}</li>)}
                    </ul>
                </ReportDetailCard>
                 <ReportDetailCard title="Produtos Faltantes" icon={<Package className="h-4 w-4" />}>
                     {report.missingProducts && report.missingProducts.length > 0 ? (
                        <ul className="space-y-1 text-sm list-disc list-inside">
                           {report.missingProducts.map(p => <li key={p}>{p}</li>)}
                       </ul>
                     ) : <p className="text-sm text-muted-foreground">Nenhum produto faltante.</p>}
                </ReportDetailCard>
            </div>
             {report.observations && (
                <ReportDetailCard title="Observações do Técnico" icon={<FileText className="h-4 w-4" />}>
                    <p className="text-sm whitespace-pre-wrap">{report.observations}</p>
                </ReportDetailCard>
            )}

            {report.photoUrls && report.photoUrls.length > 0 && (
                 <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2 text-muted-foreground"><ImageIcon className="h-4 w-4" />Fotos do Atendimento</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {report.photoUrls.map((url, index) => (
                            <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                                <Image 
                                    src={url} 
                                    alt={`Foto do serviço ${index + 1}`} 
                                    width={250} 
                                    height={333} 
                                    className="rounded-lg object-cover aspect-[3/4] hover:opacity-80 transition-opacity" 
                                />
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const AppointmentAccordionContent = ({ appointment }: { appointment: Appointment }) => {
    const firestore = useFirestore();
    const { franchiseId, serviceReportId } = appointment;

    const reportDocRef = useMemo(() =>
        firestore && franchiseId && serviceReportId ? doc(firestore, 'franchises', franchiseId, 'serviceReports', serviceReportId) : null,
    [firestore, franchiseId, serviceReportId]);

    const { data: serviceReport, isLoading } = useDoc<ServiceReport>(reportDocRef);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Spinner />
                <p className="ml-2 text-muted-foreground">Carregando relatório...</p>
            </div>
        );
    }
    
    if (serviceReport) {
        return <ServiceReportDetails report={serviceReport} />;
    }

    return (
        <div className="text-center py-6">
            <p className="text-muted-foreground text-sm mb-4">
                O relatório para este atendimento ainda não foi finalizado pelo técnico.
            </p>
        </div>
    );
}

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
            <AccordionTrigger className="p-4 bg-card hover:bg-accent rounded-lg border data-[state=open]:rounded-b-none" disabled={!appt.serviceReportId && appt.status !== 'in_progress'}>
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col text-left">
                  <span className="font-bold">{format(new Date(appt.scheduledDateTime), "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
                  <span className="text-sm text-muted-foreground">Técnico: {technician?.firstName || 'N/A'}</span>
                </div>
                <Badge variant={currentStatus.variant} className={currentStatus.className}>
                  <currentStatus.icon className="mr-1 h-3 w-3" />
                  {currentStatus.label}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-6 border border-t-0 rounded-lg rounded-t-none bg-card">
               <AppointmentAccordionContent appointment={appt} />
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  );
}
