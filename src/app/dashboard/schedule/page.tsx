"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { appointments, clients, technicians } from '@/lib/data';
import type { Appointment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Check, Clock, PlusCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { DailySchedule } from '@/components/dashboard/schedule/daily-schedule';


export default function SchedulePage() {
  const { user, hasRole } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  if (!hasRole(['owner', 'technician'])) {
    return <p>Acesso negado.</p>;
  }

  const userAppointments = appointments.filter(a => 
    hasRole('owner') ? a.franchiseId === user?.franchiseId : a.technicianId === user?.id.replace('user-', 'tech-')
  );

  const appointmentDates = userAppointments.map(a => new Date(a.date));

  const selectedAppointments = date 
    ? userAppointments.filter(a => isSameDay(new Date(a.date), date))
    : [];

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
            <DailySchedule appointments={selectedAppointments} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
