
"use client";

import { useState } from 'react';
import type { Client, Payment, ServiceLocation } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Undo, MoreHorizontal, UserX, MapPin } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


export interface ReceivablesData {
    client: Client;
    location: ServiceLocation;
    payment: Payment | null;
}

interface ReceivablesTableProps {
    data: ReceivablesData[];
    onDeactivateClient: (client: Client) => void;
}

export function ReceivablesTable({ data, onDeactivateClient }: ReceivablesTableProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const handleStatusChange = async (payment: Payment | null, newStatus: 'paid' | 'pending') => {
        if (!payment) {
            toast({ variant: 'destructive', title: "Erro", description: "Registro de pagamento não encontrado." });
            return;
        }
        setUpdatingId(payment.id);
        try {
            const paymentRef = doc(firestore, `franchises/${payment.franchiseId}/payments`, payment.id);
            await updateDoc(paymentRef, {
                status: newStatus,
                paidAt: newStatus === 'paid' ? new Date().toISOString() : null,
            });
            toast({ title: "Status Atualizado", description: `O pagamento foi marcado como ${newStatus === 'paid' ? 'pago' : 'pendente'}.` });
        } catch (error) {
            console.error("Error updating payment status:", error);
            toast({ variant: 'destructive', title: "Erro ao Atualizar", description: "Não foi possível alterar o status do pagamento." });
        } finally {
            setUpdatingId(null);
        }
    };


    if (data.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-10">
                Nenhum local com dados de faturamento para este mês.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map(({ client, location, payment }) => {
                    const status = payment?.status || 'pending';
                    const isUpdating = updatingId === payment?.id;

                    return (
                        <TableRow key={location.id}>
                            <TableCell>
                                <div className="font-medium">{client.name}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {location.address}
                                </div>
                            </TableCell>
                            <TableCell>
                                {payment ? format(new Date(payment.dueDate), 'dd/MM/yyyy') : `Dia ${location.dueDay}`}
                            </TableCell>
                            <TableCell>
                                {payment?.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'N/A'}
                            </TableCell>
                            <TableCell>
                                {status === 'paid' ? (
                                    <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                                        <CheckCircle className="mr-1 h-3 w-3" />
                                        Pago
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">
                                        <Clock className="mr-1 h-3 w-3" />
                                        Pendente
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right space-x-2 flex justify-end items-center">
                                {isUpdating ? (
                                    <Button variant="outline" size="sm" disabled>
                                        <Spinner size="small" />
                                    </Button>
                                ) : (
                                    <>
                                        {status === 'pending' ? (
                                            <Button variant="default" size="sm" onClick={() => handleStatusChange(payment, 'paid')} disabled={!payment}>
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Marcar como Pago
                                            </Button>
                                        ) : (
                                            <Button variant="secondary" size="sm" onClick={() => handleStatusChange(payment, 'pending')} disabled={!payment}>
                                                <Undo className="mr-2 h-4 w-4" />
                                                Estornar
                                            </Button>
                                        )}
                                    </>
                                )}
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => onDeactivateClient(client)} className="text-destructive">
                                            <UserX className="mr-2 h-4 w-4" />
                                            Inativar Cliente
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

    