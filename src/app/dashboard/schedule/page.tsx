"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Appointment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { DailySchedule } from '@/components/dashboard/schedule/daily-schedule';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export default function SchedulePage() {
  const { userInfo, hasRole } = useAuth();
  const firestore = useFirestore();
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  if (!hasRole(['owner', 'technician'])) {
    return <p>Acesso negado.</p>;
  }

  const appointmentsQuery = useMemoFirebase(() => {
    if (!userInfo?.franchiseId) return null;

    let q = collection(firestore, 'franchises', userInfo.franchiseId, 'appointments');

    if (hasRole('technician')) {
      // In a real app, you would likely store the user ID on the technician document
      // and query based on that. For now, we assume technician ID is derived.
      // This is a simplification.
      const techId = userInfo.id; 
      return query(q, where('technicianId', '==', techId));
    }
    
    return q;
  }, [firestore, userInfo?.franchiseId, userInfo?.id, hasRole]);

  const { data: userAppointments, isLoading } = useCollection<Appointment>(appointmentsQuery);

  const appointmentDates = useMemo(() => userAppointments?.map(a => new Date(a.scheduledDateTime)) || [], [userAppointments]);

  const selectedAppointments = useMemo(() => {
    if (!date || !userAppointments) return [];
    return userAppointments.filter(a => isSameDay(new Date(a.scheduledDateTime), date));
  }, [date, userAppointments]);


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda de Serviços</h1>
          <p className="text-muted-foreground">Visualize e gerencie os agendamentos.</p>
        </div>
        {hasRole('owner') && <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>}
      </div>

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
                {selectedAppointments.length > 0 ? `${selectedAppointments.length} serviço(s) agendado(s) para este dia.` : "Nenhum serviço agendado para este dia."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DailySchedule appointments={selectedAppointments} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
