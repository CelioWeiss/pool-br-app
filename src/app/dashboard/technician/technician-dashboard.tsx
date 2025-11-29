
"use client";

import { useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Appointment, Technician } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Calendar, CalendarCheck, CalendarClock, CalendarDays } from 'lucide-react';
import { isToday, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: string | number, icon: React.ElementType, isLoading?: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="h-8 w-1/4 animate-pulse bg-muted rounded-md" />
            ) : (
                <div className="text-2xl font-bold">{value}</div>
            )}
        </CardContent>
    </Card>
);

export function TechnicianDashboard() {
    const { userInfo } = useAuth();
    const firestore = useFirestore();
    const franchiseId = userInfo?.franchiseId;

    // First, find the technician document that corresponds to the logged-in user
    const techniciansQuery = useMemo(() =>
        firestore && franchiseId && userInfo?.id
            ? query(collection(firestore, 'franchises', franchiseId, 'technicians'), where('userId', '==', userInfo.id))
            : null
    , [firestore, franchiseId, userInfo?.id]);

    const { data: technicianDocs, isLoading: isLoadingTechnician } = useCollection<Technician>(techniciansQuery);
    const technicianId = useMemo(() => technicianDocs?.[0]?.id, [technicianDocs]);

    // Then, fetch appointments for that technician
    const appointmentsQuery = useMemo(() =>
        firestore && franchiseId && technicianId
            ? query(collection(firestore, 'franchises', franchiseId, 'appointments'), where('technicianId', '==', technicianId))
            : null
    , [firestore, franchiseId, technicianId]);
    
    const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

    const stats = useMemo(() => {
        if (!appointments) {
            return {
                today: 0,
                week: 0,
                weekCompleted: 0,
                weekPending: 0,
            };
        }

        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

        const appointmentsThisWeek = appointments.filter(appt => 
            isWithinInterval(new Date(appt.scheduledDateTime), { start: weekStart, end: weekEnd })
        );

        const appointmentsToday = appointmentsThisWeek.filter(appt => isToday(new Date(appt.scheduledDateTime)));
        
        const weekCompleted = appointmentsThisWeek.filter(appt => appt.status === 'completed').length;
        const weekPending = appointmentsThisWeek.length - weekCompleted;

        return {
            today: appointmentsToday.length,
            week: appointmentsThisWeek.length,
            weekCompleted,
            weekPending,
        };
    }, [appointments]);

    const isLoading = isLoadingTechnician || isLoadingAppointments;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Bem-vindo, {userInfo?.firstName}!
                </h1>
                <p className="text-muted-foreground">
                    Aqui está um resumo dos seus atendimentos.
                </p>
            </div>

            {isLoading ? (
                 <div className="flex h-48 items-center justify-center">
                    <Spinner size="large" />
                    <p className="ml-4">Carregando seus agendamentos...</p>
                 </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard 
                        title="Atendimentos do Dia"
                        value={stats.today}
                        icon={Calendar}
                        isLoading={isLoading}
                    />
                     <StatCard 
                        title="Atendimentos da Semana"
                        value={stats.week}
                        icon={CalendarDays}
                        isLoading={isLoading}
                    />
                     <StatCard 
                        title="Concluídos na Semana"
                        value={stats.weekCompleted}
                        icon={CalendarCheck}
                        isLoading={isLoading}
                    />
                     <StatCard 
                        title="Pendentes na Semana"
                        value={stats.weekPending}
                        icon={CalendarClock}
                        isLoading={isLoading}
                    />
                </div>
            )}
            
            {/* We can add a list of today's appointments here in the future */}

        </div>
    );
}

    