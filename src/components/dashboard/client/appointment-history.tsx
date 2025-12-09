
"use client";

import type { Appointment, Technician, ServiceReport } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, X, Microscope, Wrench, Image as ImageIcon, Droplets, ListChecks, Package, FileText, Thermometer, Wind, TestTube, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const ParameterDisplay = ({ label, value, unit, icon: Icon }: { label: string, value: any, unit: string, icon: React.ElementType }) => (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value ?? 'N/A'} <span className="text-sm font-normal text-muted-foreground">{unit}</span></p>
        </div>
    </div>
);


const ServiceReportDetails = ({ report }: { report: ServiceReport }) => {
    
    const parameters = [
        { label: "Cloro", value: report.chlorine, unit: "ppm", icon: Droplets },
        { label: "pH", value: report.ph, unit: "", icon: TestTube },
        { label: "Alcalinidade", value: report.alkalinity, unit: "ppm", icon: Wind },
        { label: "Ác. Cianúrico", value: report.cya, unit: "ppm", icon: Microscope },
        { label: "Dureza Cálcica", value: report.calciumHardness, unit: "ppm", icon: Wrench },
        { label: "ORP", value: report.orp, unit: "mV", icon: Zap },
        { label: "TDS", value: report.tds, unit: "ppm", icon: Microscope },
        { label: "Temperatura", value: report.temperature, unit: "°C", icon: Thermometer },
    ];

    const hasAnyParameter = parameters.some(p => p.value !== undefined && p.value !== null);

    return (
        <CardContent className="pt-6 space-y-8">
            <ReportSection title="Parâmetros da Água" icon={Droplets} hasData={hasAnyParameter}>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {parameters.map(p => (
                        <ParameterDisplay key={p.label} {...p} />
                    ))}
                </div>
            </ReportSection>

            <Separator />
            
            <ReportSection title="Serviços Realizados" icon={ListChecks} hasData={!!report.servicesPerformed?.length}>
                 <ul className="space-y-1 text-sm list-disc list-inside columns-2">
                    {report.servicesPerformed.map(s => <li key={s}>{s}</li>)}
                </ul>
            </ReportSection>
            
            {!!report.missingProducts?.length && <Separator />}
            
            <ReportSection title="Produtos Faltantes" icon={Package} hasData={!!report.missingProducts?.length}>
                 <ul className="space-y-1 text-sm list-disc list-inside columns-2">
                    {report.missingProducts.map(p => <li key={p}>{p}</li>)}
                </ul>
            </ReportSection>

            {!!report.observations && <Separator />}

            <ReportSection title="Observações do Técnico" icon={FileText} hasData={!!report.observations}>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap p-4 border rounded-lg bg-muted/50">{report.observations}</p>
            </ReportSection>
            
            {!!report.photoUrls?.length && <Separator />}

            <ReportSection title="Fotos do Atendimento" icon={ImageIcon} hasData={!!report.photoUrls?.length}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report.photoUrls.map((url, index) => (
                        <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                            <Image 
                                src={url} 
                                alt={`Foto do serviço ${index + 1}`} 
                                width={800} 
                                height={600} 
                                className="rounded-lg object-cover w-full h-auto hover:opacity-80 transition-opacity shadow-md" 
                            />
                        </a>
                    ))}
                </div>
            </ReportSection>
        </CardContent>
    );
};


const AppointmentReport = ({ appointment, technicianName }: { appointment: Appointment, technicianName: string }) => {
    const firestore = useFirestore();
    const { franchiseId, serviceReportId } = appointment;

    const reportDocRef = useMemo(() =>
        firestore && franchiseId && serviceReportId ? doc(firestore, 'franchises', franchiseId, 'serviceReports', serviceReportId) : null,
    [firestore, franchiseId, serviceReportId]);

    const { data: serviceReport, isLoading } = useDoc<ServiceReport>(reportDocRef);

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                    <CardTitle>{format(new Date(appointment.scheduledDateTime), "dd 'de' MMMM, yyyy", { locale: ptBR })}</CardTitle>
                    <p className="text-sm text-muted-foreground">Técnico: {technicianName}</p>
                </div>
                 <Badge className="bg-green-100 text-green-800 border-green-200">
                    <Check className="mr-1 h-3 w-3" />
                    Concluído
                </Badge>
            </CardHeader>
            {isLoading && (
                <div className="flex items-center justify-center p-8">
                    <Spinner />
                    <p className="ml-2 text-muted-foreground">Carregando relatório...</p>
                </div>
            )}
            {serviceReport && <ServiceReportDetails report={serviceReport} />}
            {!serviceReport && !isLoading && (
                 <CardContent>
                    <p className="text-muted-foreground text-sm text-center py-4">Relatório não encontrado.</p>
                </CardContent>
            )}
        </Card>
    );
}

export function AppointmentHistory({ appointments, technicians }: { appointments: Appointment[], technicians: Technician[] }) {

  const techniciansMap = useMemo(() => 
    new Map(technicians.map(t => [t.id, t])),
    [technicians]
  );

  const { completedWithReport, otherAppointments } = useMemo(() => {
    const completedWithReport: Appointment[] = [];
    const otherAppointments: Appointment[] = [];

    appointments.forEach(appt => {
        if (appt.status === 'completed' && appt.serviceReportId) {
            completedWithReport.push(appt);
        } else {
            otherAppointments.push(appt);
        }
    });

    completedWithReport.sort((a,b) => new Date(b.scheduledDateTime).getTime() - new Date(a.scheduledDateTime).getTime());
    otherAppointments.sort((a,b) => new Date(b.scheduledDateTime).getTime() - new Date(a.scheduledDateTime).getTime());

    return { completedWithReport, otherAppointments };

  }, [appointments]);
  
  if (!appointments || appointments.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhum histórico de atendimento encontrado.</p>;
  }

  const statusInfo = {
    scheduled: { icon: Clock, label: "Agendado", variant: "secondary" as const, className: "" },
    in_progress: { icon: Clock, label: "Em Progresso", variant: "default" as const, className: "bg-blue-100 text-blue-800 border-blue-200" },
    completed: { icon: Check, label: "Concluído", variant: "default" as const, className: "bg-green-100 text-green-800 border-green-200" },
    cancelled: { icon: X, label: "Cancelado", variant: "destructive" as const, className: "" },
  };

  return (
    <div className="space-y-4">
        {completedWithReport.map(appt => {
            const technician = techniciansMap.get(appt.technicianId);
            const techName = technician ? `${technician.firstName} ${technician.lastName}` : 'N/A';
            return <AppointmentReport key={appt.id} appointment={appt} technicianName={techName} />
        })}

        {otherAppointments.length > 0 && (
             <Accordion type="single" collapsible className="w-full space-y-2">
                {otherAppointments.map((appt) => {
                    const technician = techniciansMap.get(appt.technicianId);
                    const currentStatus = statusInfo[appt.status] || statusInfo.scheduled;
                    
                    return (
                    <AccordionItem value={appt.id} key={appt.id}>
                        <AccordionTrigger className="p-4 bg-card hover:bg-accent rounded-lg border data-[state=open]:rounded-b-none" disabled>
                        <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col text-left">
                            <span className="font-bold">{format(new Date(appt.scheduledDateTime), "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
                            <span className="text-sm text-muted-foreground">Técnico: {technician?.firstName || 'N/A'}</span>
                            </div>
                            <Badge variant={currentStatus.variant} className={cn(currentStatus.className, 'whitespace-nowrap')}>
                            <currentStatus.icon className="mr-1 h-3 w-3" />
                            {currentStatus.label}
                            </Badge>
                        </div>
                        </AccordionTrigger>
                    </AccordionItem>
                    )
                })}
            </Accordion>
        )}
    </div>
  );
}

    