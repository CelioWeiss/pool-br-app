
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Appointment, Technician, Client, ServiceLocation } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { 
  format, 
  isSameDay,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { DailySchedule } from '@/components/dashboard/schedule/daily-schedule';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { gerarAgendaDoMesNoFirestore } from '@/lib/schedule-generator';
import { RescheduleModal } from '@/components/dashboard/schedule/reschedule-modal';


export default function SchedulePage() {
  const { userInfo, hasRole } = useAuth();
  const firestore = useFirestore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const franchiseId = userInfo?.franchiseId;

  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);

  // --- Data Fetching ---
  const techniciansQuery = useMemo(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'technicians') : null
  , [firestore, franchiseId]);
  const { data: technicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansQuery);

  const clientsQuery = useMemo(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'clients') : null
  , [firestore, franchiseId]);
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const allLocationsQuery = useMemo(() => {
      if (!firestore || !franchiseId) return null;
      return query(collection(firestore, `franchises/${franchiseId}/locations`));
  }, [firestore, franchiseId]);
  const { data: allLocations, isLoading: isLoadingLocations } = useCollection<ServiceLocation>(allLocationsQuery);
  
  const start = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const end = useMemo(() => endOfMonth(currentDate), [currentDate]);

  const appointmentsQuery = useMemo(() => {
      if (!firestore || !franchiseId) return null;
      return query(
          collection(firestore, 'franchises', franchiseId, 'appointments'),
          where('scheduledDateTime', '>=', start.toISOString()),
          where('scheduledDateTime', '<=', end.toISOString())
      );
  }, [firestore, franchiseId, start, end]);

  const { data: allAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);


  useEffect(() => {
    if (!firestore || !franchiseId || !allLocations || !allLocations.length) return;
  
    gerarAgendaDoMesNoFirestore({
      firestore,
      franchiseId,
      locations: allLocations,
      month: currentDate
    });
  }, [firestore, franchiseId, allLocations, currentDate]);

  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('all');
  
  const filteredAppointments = useMemo(() => {
    let appointmentsToFilter = allAppointments || [];
    
    if (hasRole('technician') && userInfo?.id) {
        const techDoc = technicians?.find(t => t.userId === userInfo.id);
        if (techDoc) {
            return appointmentsToFilter.filter(a => a.technicianId === techDoc.id);
        }
        return [];
    }

    if (hasRole('owner')) {
      if (selectedTechnicianId === 'all') {
        return appointmentsToFilter;
      }
      return appointmentsToFilter.filter(a => a.technicianId === selectedTechnicianId);
    }

    return [];
  }, [allAppointments, selectedTechnicianId, hasRole, userInfo?.id, technicians]);
  
  
  const isLoading = isLoadingTechnicians || isLoadingClients || isLoadingAppointments || isLoadingLocations;

  const appointmentDates = useMemo(() => filteredAppointments?.map(a => new Date(a.scheduledDateTime)) || [], [filteredAppointments]);

 const [dailySchedule, setDailySchedule] = useState<{ pendingAppointments: Appointment[], completedAppointments: Appointment[] }>({ pendingAppointments: [], completedAppointments: [] });

 useEffect(() => {
    if (!selectedDate || !filteredAppointments) {
      setDailySchedule({ pendingAppointments: [], completedAppointments: [] });
      return;
    }

    const todaysAppointments = filteredAppointments.filter(a => isSameDay(new Date(a.scheduledDateTime), selectedDate));
    
    const pending: Appointment[] = [];
    const completed: Appointment[] = [];

    todaysAppointments.forEach(appt => {
      if (appt.status === 'scheduled' || appt.status === 'in_progress') {
        pending.push(appt);
      } else {
        completed.push(appt);
      }
    });

    setDailySchedule({ pendingAppointments: pending, completedAppointments: completed });
  }, [selectedDate, filteredAppointments]);


  if (!hasRole(['owner', 'technician'])) {
    return <p>Acesso negado.</p>;
  }

  return (
    <>
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
                {isLoading ? 'Carregando agendamentos...' : `Encontrado(s) ${dailySchedule.pendingAppointments.length} serviço(s) pendente(s) e ${dailySchedule.completedAppointments.length} concluído(s).`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
             {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <DailySchedule 
                pendingAppointments={dailySchedule.pendingAppointments}
                completedAppointments={dailySchedule.completedAppointments}
                clients={clients || []}
                technicians={technicians || []}
                locations={allLocations || []}
                onReschedule={setAppointmentToReschedule}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
     {appointmentToReschedule && (
        <RescheduleModal
          appointment={appointmentToReschedule}
          onClose={() => setAppointmentToReschedule(null)}
        />
      )}
    </>
  );
}
