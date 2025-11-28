"use client";

import { useMemo, useState } from 'react';
import type { Appointment, Client, Technician } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Check, X, Calendar, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/use-auth';

const AppointmentItem = ({ appointment, client, technician }: { appointment: Appointment, client?: Client, technician?: Technician }) => {
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

    // If it's a recurring/auto-generated appointment, it needs to be created in the DB first.
    if (appointment.id.startsWith('auto-')) {
      const appointmentsRef = collection(firestore, 'franchises', userInfo.franchiseId, 'appointments');
      
      const newAppointmentData: Omit<Appointment, 'id'> = {
        clientId: appointment.clientId,
        technicianId: appointment.technicianId,
        franchiseId: appointment.franchiseId,
        scheduledDateTime: appointment.scheduledDateTime,
        status: 'in_progress', // Set to "in progress" immediately
      };
      
      try {
        const docRef = await addDoc(appointmentsRef, newAppointmentData);
        appointmentIdToRedirect = docRef.id;
      } catch (error) {
         console.error("Error creating appointment document:", error);
         const permissionError = new FirestorePermissionError({
            path: appointmentsRef.path,
            operation: 'create',
            requestResourceData: newAppointmentData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsCreating(false);
        return;
      }
    }
    
    router.push(`/relatorio/${appointmentIdToRedirect}`);
  };


  return (
    <div className="flex items-center gap-4 p-4 border-b last:border-b-0">
      
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
        <Button onClick={handleStartAppointment} size="sm" disabled={isCreating}>
            {isCreating ? (
                <><Spinner size="small" className="mr-2" /> Criando...</>
            ) : (
                <><PlayCircle className="mr-2 h-4 w-4" /> Iniciar Atendimento</>
            )}
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
