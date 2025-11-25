
"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Client, Technician, DayOfWeek } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay,
  isSameMonth,
  addMonths,
  subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';

const dayOfWeekMap: Record<DayOfWeek, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

interface GeneratedAppointment {
  id: string;
  clientId: string;
  clientName: string;
  technicianId: string | null;
  technicianName: string;
  scheduledDate: Date;
  address: string;
}

export default function AutoSchedulePage() {
  const { userInfo, hasRole } = useAuth();
  const firestore = useFirestore();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const franchiseId = userInfo?.franchiseId;

  const clientsCollection = useMemoFirebase(() => 
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'clients') : null
  , [firestore, franchiseId]);
  
  const techniciansCollection = useMemoFirebase(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'technicians') : null
  , [firestore, franchiseId]);

  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);
  const { data: technicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansCollection);

  const techniciansMap = useMemo(() => 
    new Map(technicians?.map(t => [t.id, `${t.firstName} ${t.lastName}`]))
  , [technicians]);

  const generatedAppointments = useMemo(() => {
    if (!clients) return [];

    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start, end });
    const appointments: GeneratedAppointment[] = [];

    for (const client of clients) {
      if (client.serviceDays && client.serviceDays.length > 0) {
        for (const day of daysInMonth) {
          const dayOfWeekJs = getDay(day); // 0 for Sunday, 1 for Monday, etc.
          const serviceDaysAsNumbers = client.serviceDays.map(d => dayOfWeekMap[d]);

          if (serviceDaysAsNumbers.includes(dayOfWeekJs)) {
            const technicianName = client.technicianId ? techniciansMap.get(client.technicianId) || 'Não atribuído' : 'Não atribuído';
            appointments.push({
              id: `${client.id}-${format(day, 'yyyy-MM-dd')}`,
              clientId: client.id,
              clientName: client.name,
              technicianId: client.technicianId,
              technicianName: technicianName,
              scheduledDate: day,
              address: client.address,
            });
          }
        }
      }
    }
    return appointments.sort((a,b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }, [clients, currentDate, techniciansMap]);

  const appointmentsByDay = useMemo(() => {
    const grouped: Record<string, GeneratedAppointment[]> = {};
    for (const appt of generatedAppointments) {
      const dayKey = format(appt.scheduledDate, 'yyyy-MM-dd');
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(appt);
    }
    return grouped;
  }, [generatedAppointments]);


  if (!hasRole(['owner'])) {
    return <p>Acesso negado.</p>;
  }

  const isLoading = isLoadingClients || isLoadingTechnicians;
  const days = Object.keys(appointmentsByDay);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda Automática</h1>
          <p className="text-muted-foreground">Previsão de agendamentos baseada nos dias de atendimento dos clientes.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold capitalize w-48 text-center">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
             <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agendamentos para {format(currentDate, 'MMMM', { locale: ptBR })}</CardTitle>
          <CardDescription>
            {isLoading ? 'Carregando...' : `Encontrado(s) ${generatedAppointments.length} agendamento(s) potencial(is) para este mês.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Spinner />
            </div>
          ) : days.length > 0 ? (
            <div className="space-y-6">
              {days.map(day => (
                <div key={day}>
                    <h3 className="text-lg font-semibold capitalize border-b pb-2 mb-2">
                        {format(new Date(day), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </h3>
                    <div className="space-y-4">
                        {appointmentsByDay[day].map(appt => (
                             <div key={appt.id} className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-accent">
                                <div>
                                    <Link href={`/dashboard/clients/${appt.clientId}`} className="font-bold text-primary hover:underline">
                                        {appt.clientName}
                                    </Link>
                                    <p className="text-sm text-muted-foreground">{appt.address}</p>
                                    <p className="text-sm text-muted-foreground">Técnico: {appt.technicianName}</p>
                                </div>
                             </div>
                        ))}
                    </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-48">
                <Calendar className="h-12 w-12 mb-4" />
                <p>Nenhum cliente com dias de atendimento definidos para este mês.</p>
                <Button asChild variant="link">
                    <Link href="/dashboard/clients">Gerenciar Clientes</Link>
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
