
"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Appointment, Technician, Client, DayOfWeek } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { 
  format, 
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { DailySchedule } from '@/components/dashboard/schedule/daily-schedule';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const dayOfWeekMap: Record<DayOfWeek, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

export default function SchedulePage() {
  const { userInfo, hasRole } = useAuth();
  const firestore = useFirestore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>(
    hasRole('technician') ? userInfo?.id || 'all' : 'all'
  );
  
  const franchiseId = userInfo?.franchiseId;

  // --- Data Fetching ---
  const techniciansCollection = useMemoFirebase(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'technicians') : null
  , [firestore, franchiseId]);

  const clientsCollection = useMemoFirebase(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'clients') : null
  , [firestore, franchiseId]);
  
  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !franchiseId) return null;
    return collection(firestore, 'franchises', franchiseId, 'appointments');
  }, [firestore, franchiseId]);

  const { data: technicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansCollection);
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);
  const { data: manualAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

  // --- Logic for Combining Manual and Auto-Generated Appointments ---
  const allAppointments = useMemo(() => {
    if (!clients || !technicians) return [];

    // 1. Generate appointments from client service days
    const generatedAppointments: Appointment[] = [];
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start, end });

    for (const client of clients) {
      if (client.serviceDays && client.serviceDays.length > 0 && client.technicianId) {
        const serviceDaysAsNumbers = client.serviceDays.map(d => dayOfWeekMap[d]);
        for (const day of daysInMonth) {
          const dayOfWeekJs = getDay(day);
          if (serviceDaysAsNumbers.includes(dayOfWeekJs)) {
            generatedAppointments.push({
              id: `auto-${client.id}-${format(day, 'yyyy-MM-dd')}`,
              clientId: client.id,
              technicianId: client.technicianId,
              franchiseId: client.franchiseId,
              scheduledDateTime: day.toISOString(),
              status: 'scheduled', 
            });
          }
        }
      }
    }
    
    // 2. Combine with manual appointments, avoiding duplicates
    const combinedAppointmentsMap = new Map<string, Appointment>();

    // Add generated first, so manual can override if needed on the same day for the same client
    for (const appt of generatedAppointments) {
      const key = `${appt.clientId}-${format(new Date(appt.scheduledDateTime), 'yyyy-MM-dd')}`;
      if (!combinedAppointmentsMap.has(key)) {
        combinedAppointmentsMap.set(key, appt);
      }
    }
    
    for (const appt of (manualAppointments || [])) {
        const key = `${appt.clientId}-${format(new Date(appt.scheduledDateTime), 'yyyy-MM-dd')}`;
        combinedAppointmentsMap.set(key, appt); // Manual appointments always override auto-generated
    }
    
    const combined = Array.from(combinedAppointmentsMap.values());


    // 3. Filter based on user role and selected technician
    if (hasRole('technician') && userInfo?.id) {
      return combined.filter(a => a.technicianId === userInfo.id);
    }
    
    if (hasRole('owner') && selectedTechnicianId !== 'all') {
      return combined.filter(a => a.technicianId === selectedTechnicianId);
    }

    return combined;

  }, [clients, technicians, manualAppointments, currentDate, hasRole, userInfo, selectedTechnicianId]);
  
  const isLoading = isLoadingTechnicians || isLoadingClients || isLoadingAppointments;

  if (!hasRole(['owner', 'technician'])) {
    return <p>Acesso negado.</p>;
  }

  const appointmentDates = useMemo(() => allAppointments?.map(a => new Date(a.scheduledDateTime)) || [], [allAppointments]);

  const selectedAppointments = useMemo(() => {
    if (!selectedDate || !allAppointments) return [];
    return allAppointments.filter(a => isSameDay(new Date(a.scheduledDateTime), selectedDate));
  }, [selectedDate, allAppointments]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda de Serviços</h1>
          <p className="text-muted-foreground">Visualize e gerencie os agendamentos.</p>
        </div>
        {hasRole('owner') && <Button disabled>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Agendamento Manual
        </Button>}
      </div>

       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

          {hasRole('owner') && (
            <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="technician-filter">Filtrar por técnico</Label>
                <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
                    <SelectTrigger id="technician-filter" className="w-[220px]">
                        <SelectValue placeholder="Selecione um técnico" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Técnicos</SelectItem>
                        {technicians?.map(tech => (
                            <SelectItem key={tech.id} value={tech.id}>{tech.firstName} {tech.lastName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          )}
       </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-1">
             <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentDate}
                onMonthChange={setCurrentDate}
                locale={ptBR}
                className="w-full"
                modifiers={{ scheduled: appointmentDates }}
                modifiersStyles={{
                  scheduled: {
                    border: "2px solid hsl(var(--primary))",
                    borderRadius: 'var(--radius)',
                  },
                }}
                components={{
                  IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                  IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
                }}
              />
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
                Atendimentos para {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : 'Nenhuma data selecionada'}
            </CardTitle>
            <CardDescription>
                {isLoading ? 'Carregando agendamentos...' : (selectedAppointments.length > 0 ? `${selectedAppointments.length} serviço(s) agendado(s) para este dia.` : "Nenhum serviço agendado para este dia.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
             {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <DailySchedule 
                appointments={selectedAppointments} 
                clients={clients || []}
                technicians={technicians || []}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
