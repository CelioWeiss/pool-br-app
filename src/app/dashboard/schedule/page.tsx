
"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Appointment, Technician } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { DailySchedule } from '@/components/dashboard/schedule/daily-schedule';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function SchedulePage() {
  const { userInfo, hasRole } = useAuth();
  const firestore = useFirestore();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>(
    hasRole('technician') ? userInfo?.id || 'all' : 'all'
  );
  
  const franchiseId = userInfo?.franchiseId;

  // Fetch all technicians for the owner to use in the filter
  const techniciansCollection = useMemoFirebase(() =>
    firestore && franchiseId && hasRole('owner') ? collection(firestore, 'franchises', franchiseId, 'technicians') : null
  , [firestore, franchiseId, hasRole]);

  const { data: technicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansCollection);

  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !franchiseId) return null;
    
    const baseQuery = collection(firestore, 'franchises', franchiseId, 'appointments');

    // Owner can see all or filter by technician
    if (hasRole('owner')) {
        if (selectedTechnicianId === 'all') {
            return baseQuery; // All appointments for the franchise
        }
        return query(baseQuery, where('technicianId', '==', selectedTechnicianId));
    }
    // Technician only sees their own appointments
    if (hasRole('technician') && userInfo.id) {
      return query(baseQuery, where('technicianId', '==', userInfo.id));
    }
    return null;
  }, [firestore, franchiseId, userInfo, hasRole, selectedTechnicianId]);

  const { data: userAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

  const isLoading = isLoadingTechnicians || isLoadingAppointments;

  if (!hasRole(['owner', 'technician'])) {
    return <p>Acesso negado.</p>;
  }

  const appointmentDates = useMemo(() => userAppointments?.map(a => new Date(a.scheduledDateTime)) || [], [userAppointments]);

  const selectedAppointments = useMemo(() => {
    if (!date || !userAppointments) return [];
    return userAppointments.filter(a => isSameDay(new Date(a.scheduledDateTime), date));
  }, [date, userAppointments]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda de Serviços</h1>
          <p className="text-muted-foreground">Visualize e gerencie os agendamentos.</p>
        </div>
        {hasRole('owner') && <Button disabled>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>}
      </div>

       {hasRole('owner') && (
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="technician-filter">Filtrar por técnico</Label>
            </div>
            <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
                <SelectTrigger id="technician-filter" className="w-[280px]">
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

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-1">
             <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
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
                Atendimentos para {date ? format(date, "dd 'de' MMMM", { locale: ptBR }) : 'Nenhuma data selecionada'}
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
              <DailySchedule appointments={selectedAppointments} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
