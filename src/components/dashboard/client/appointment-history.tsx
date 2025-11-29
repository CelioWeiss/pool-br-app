
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
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const ReportSection = ({ title, icon: Icon, children, hasData = true }: { title: string, icon: React.ElementType, children: React.ReactNode, hasData?: boolean }) => {
    if (!hasData) return null;

    return (
        <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Icon className="h-5 w-5 text-primary" />
                {title}
            </h3>
            {children}
        </div>
    );
};


const ServiceReportDetails = ({ report }: { report: ServiceReport }) => {
    
    const parameters = [
        { label: "Cloro", value: report.chlorine, unit: "ppm" },
        { label: "pH", value: report.ph, unit: "" },
        { label: "Alcalinidade", value: report.alkalinity, unit: "ppm" },
        { label: "Ác. Cianúrico", value: report.cya, unit: "ppm" },
        { label: "Dureza Cálcica", value: report.calciumHardness, unit: "ppm" },
    ].filter(p => p.value !== undefined && p.value !== null);

    return (
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
                <ReportSection title="Parâmetros da Água" icon={Droplets} hasData={parameters.length > 0}>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm p-4 border rounded-lg bg-muted/50">
                        {parameters.map(p => (
                            <div key={p.label} className="flex justify-between border-b border-dashed">
                                <span className="text-muted-foreground">{p.label}:</span>
                                <span className="font-mono">{p.value} {p.unit}</span>
                            </div>
                        ))}
                    </div>
                </ReportSection>

                <Separator />
                
                <ReportSection title="Serviços Realizados" icon={ListChecks} hasData={!!report.servicesPerformed?.length}>
                     <ul className="space-y-1 text-sm list-disc list-inside columns-2">
                        {report.servicesPerformed.map(s => <li key={s}>{s}</li>)}
                    </ul>
                </ReportSection>

                <Separator />
                
                 <ReportSection title="Produtos Faltantes" icon={Package} hasData={!!report.missingProducts?.length}>
                     <ul className="space-y-1 text-sm list-disc list-inside columns-2">
                        {report.missingProducts.map(p => <li key={p}>{p}</li>)}
                    </ul>
                </ReportSection>

                <Separator />

                <ReportSection title="Observações do Técnico" icon={FileText} hasData={!!report.observations}>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap p-4 border rounded-lg bg-muted/50">{report.observations}</p>
                </ReportSection>
            </div>
            
            <div className="md:col-span-1 space-y-4">
                 <ReportSection title="Fotos do Atendimento" icon={ImageIcon} hasData={!!report.photoUrls?.length}>
                    <div className="grid grid-cols-2 gap-4">
                        {report.photoUrls.map((url, index) => (
                            <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                                <Image 
                                    src={url} 
                                    alt={`Foto do serviço ${index + 1}`} 
                                    width={300} 
                                    height={400} 
                                    className="rounded-lg object-cover w-full aspect-[3/4] hover:opacity-80 transition-opacity shadow-md" 
                                />
                            </a>
                        ))}
                    </div>
                </ReportSection>
            </div>
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
