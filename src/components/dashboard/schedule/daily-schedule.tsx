
"use client";

import { useMemo, useState } from 'react';
import type { Appointment, Client, Technician, ServiceLocation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Check, X, Calendar, PlayCircle, History, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { addDoc, collection, doc } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/use-auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const AppointmentItem = ({ appointment, client, technician, location }: { appointment: Appointment, client?: Client, technician?: Technician, location?: ServiceLocation }) => {
  const router = useRouter();
  const firestore = useFirestore();
  const { userInfo } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const statusInfo = {
    scheduled: { icon: Clock, color: "bg-blue-500", label: "Agendado" },
    in_progress: { icon: PlayCircle, color: "bg-yellow-500", label: "Em Progresso" },
    completed: { icon: Check, color: "bg-green-500", label: "Concluído" },
    cancelled: { icon: X, color: "bg-red-500", label: "Cancelado" },
  };

  const currentStatus = statusInfo[appointment.status] || statusInfo.scheduled;
  
  const handleStartAppointment = async () => {
    if (!firestore || !userInfo?.franchiseId) return;

    setIsCreating(true);
    let appointmentIdToRedirect = appointment.id;

    try {
        // If it's a recurring/auto-generated appointment, it needs to be created in the DB first.
        if (appointment.id.startsWith('auto-')) {
            const appointmentsRef = collection(firestore, 'franchises', userInfo.franchiseId, 'appointments');
            const newAppointmentRef = doc(appointmentsRef); // Create a reference with a new ID
            
            const newAppointmentData: Appointment = {
                id: newAppointmentRef.id, // Use the new ID
                clientId: appointment.clientId,
                locationId: appointment.locationId,
                technicianId: appointment.technicianId,
                franchiseId: appointment.franchiseId,
                scheduledDateTime: appointment.scheduledDateTime,
                status: 'in_progress', // Set to "in progress" immediately
            };

            await addDoc(appointmentsRef, newAppointmentData);
            appointmentIdToRedirect = newAppointmentRef.id;
        }
        
        router.push(`/relatorio/${appointmentIdToRedirect}`);
    } catch (error) {
        console.error("Error creating appointment document:", error);
        const permissionError = new FirestorePermissionError({
            path: `franchises/${userInfo.franchiseId}/appointments`,
            operation: 'create',
            requestResourceData: appointment,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsCreating(false);
        return;
    }
  };


  return (
    <div className="flex items-center gap-4 p-4 border-b last:border-b-0">
      
      <div className="flex-1">
        <div className="flex justify-between items-start">
            <div>
                 <Link href={`/dashboard/clients/${appointment.clientId}`} className="font-semibold hover:underline text-primary">
                  {client?.name || 'Cliente não encontrado'}
                </Link>
                <p className="text-sm text-muted-foreground">{location?.address || 'Endereço não encontrado'}</p>
                <p className="text-sm text-muted-foreground">Técnico: {technician ? `${technician.firstName} ${technician.lastName}` : 'N/A'}</p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1.5 whitespace-nowrap">
                <span className={`h-2 w-2 rounded-full ${currentStatus.color}`} />
                {currentStatus.label}
            </Badge>
        </div>
      </div>
       {(appointment.status === 'scheduled' || appointment.status === 'in_progress') && (
        <Button onClick={handleStartAppointment} size="sm" disabled={isCreating}>
            {isCreating ? (
                <><Spinner size="small" className="mr-2" /> Criando...</>
            ) : (
                <><PlayCircle className="mr-2 h-4 w-4" /> {appointment.status === 'in_progress' ? 'Continuar' : 'Iniciar'}</>
            )}
        </Button>
       )}
       {appointment.status === 'completed' && appointment.serviceReportId && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/relatorio/${appointment.id}`}>
              <FileText className="mr-2 h-4 w-4" />
              Ver Relatório
            </Link>
          </Button>
       )}
    </div>
  );
};

const AppointmentList = ({ title, appointments, icon: Icon, clientsMap, techniciansMap, locationsMap }: { title: string, appointments: Appointment[], icon: React.ElementType, clientsMap: Map<string, Client>, techniciansMap: Map<string, Technician>, locationsMap: Map<string, ServiceLocation> }) => {
  if (appointments.length === 0) {
    return null;
  }
  return (
     <AccordionItem value={title.toLowerCase()}>
        <AccordionTrigger className="px-4">
            <div className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                <h3 className="font-semibold">{title}</h3>
                <Badge variant="secondary">{appointments.length}</Badge>
            </div>
        </AccordionTrigger>
        <AccordionContent className="p-0">
            <div className="divide-y border-t">
              {appointments.map(appt => (
                <AppointmentItem 
                    key={appt.id} 
                    appointment={appt} 
                    client={clientsMap.get(appt.clientId)}
                    technician={techniciansMap.get(appt.technicianId)}
                    location={locationsMap.get(appt.locationId)}
                />
              ))}
            </div>
        </AccordionContent>
    </AccordionItem>
  )
}

export function DailySchedule({ pendingAppointments, completedAppointments, clients, technicians, locations }: { pendingAppointments: Appointment[], completedAppointments: Appointment[], clients: Client[], technicians: Technician[], locations: ServiceLocation[] }) {
  const clientsMap = useMemo(() => new Map(clients?.map(c => [c.id, c])), [clients]);
  const techniciansMap = useMemo(() => new Map(technicians?.map(t => [t.id, t])), [technicians]);
  const locationsMap = useMemo(() => new Map(locations?.map(l => [l.id, l])), [locations]);
  
  if (pendingAppointments.length === 0 && completedAppointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <Calendar className="h-12 w-12 mb-4" />
        <p>Nenhum atendimento para a data selecionada.</p>
      </div>
    )
  }

  const sortedPending = [...pendingAppointments].sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime());
  const sortedCompleted = [...completedAppointments].sort((a, b) => new Date(b.scheduledDateTime).getTime() - new Date(a.scheduledDateTime).getTime());


  return (
    <Accordion type="multiple" defaultValue={['pendentes', 'concluídos no dia']} className="w-full">
      <AppointmentList 
        title="Pendentes"
        icon={Clock}
        appointments={sortedPending}
        clientsMap={clientsMap}
        techniciansMap={techniciansMap}
        locationsMap={locationsMap}
      />
      <AppointmentList 
        title="Concluídos no Dia"
        icon={History}
        appointments={sortedCompleted}
        clientsMap={clientsMap}
        techniciansMap={techniciansMap}
        locationsMap={locationsMap}
      />
    </Accordion>
  );
}
