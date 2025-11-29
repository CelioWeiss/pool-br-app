
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Appointment, Client, Technician } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PendingClients({ franchiseId }: { franchiseId: string }) {
    const firestore = useFirestore();

    const appointmentsQuery = useMemo(() => 
        firestore ? query(
            collection(firestore, 'franchises', franchiseId, 'appointments'),
            where('status', 'in', ['scheduled', 'in_progress'])
        ) : null,
    [firestore, franchiseId]);

    const clientsCollection = useMemo(() => 
        firestore ? collection(firestore, 'franchises', franchiseId, 'clients') : null,
    [firestore, franchiseId]);
    
    const techniciansCollection = useMemo(() =>
        firestore ? collection(firestore, 'franchises', franchiseId, 'technicians') : null,
    [firestore, franchiseId]);

    const { data: pendingAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);
    const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);
    const { data: technicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansCollection);

    const isLoading = isLoadingAppointments || isLoadingClients || isLoadingTechnicians;

    const clientsMap = useMemo(() => new Map(clients?.map(c => [c.id, c])), [clients]);
    const techniciansMap = useMemo(() => new Map(technicians?.map(t => [t.id, t])), [technicians]);

    const clientsWithPendingAppointments = useMemo(() => {
        if (!pendingAppointments || !clientsMap.size) return [];
        
        const uniqueClientIds = new Set<string>();
        
        // Sort appointments by date to find the next one for each client
        const sortedAppointments = [...pendingAppointments].sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime());

        const result = sortedAppointments.reduce((acc, appt) => {
            if (!uniqueClientIds.has(appt.clientId)) {
                uniqueClientIds.add(appt.clientId);
                const client = clientsMap.get(appt.clientId);
                if (client) {
                    acc.push({
                        client,
                        nextAppointment: appt,
                    });
                }
            }
            return acc;
        }, [] as { client: Client; nextAppointment: Appointment }[]);

        return result;

    }, [pendingAppointments, clientsMap]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Clientes com Atendimentos Pendentes</CardTitle>
                <CardDescription>Clientes que possuem serviços agendados ou em andamento.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Spinner />
                    </div>
                ) : clientsWithPendingAppointments.length > 0 ? (
                    <div className="space-y-4">
                        {clientsWithPendingAppointments.map(({ client, nextAppointment }) => {
                            const technician = techniciansMap.get(nextAppointment.technicianId);
                            const clientInitials = (client.name || '').split(' ').map(n => n[0]).join('').substring(0, 2);

                            return (
                                <div key={client.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                                    <Avatar>
                                        <AvatarImage src={client.avatarUrl} alt={client.name} />
                                        <AvatarFallback>{clientInitials}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <Link href={`/dashboard/clients/${client.id}`} className="font-semibold hover:underline">
                                            {client.name}
                                        </Link>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                            <User className="h-3 w-3" />
                                            Téc: {technician ? `${technician.firstName} ${technician.lastName}` : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">Próximo</p>
                                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                                            {format(new Date(nextAppointment.scheduledDateTime), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <Calendar className="mx-auto h-12 w-12 mb-4" />
                        <p>Nenhum cliente com atendimentos pendentes no momento.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

    