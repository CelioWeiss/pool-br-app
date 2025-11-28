
"use client";

import { useState } from 'react';
import type { Client, Payment } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, CheckCircle, Clock } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface ReceivablesData {
    client: Client;
    payment: Payment | null;
}

interface ReceivablesTableProps {
    data: ReceivablesData[];
}

export function ReceivablesTable({ data }: ReceivablesTableProps) {
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
            toast({ title: "Status Atualizado", description: `O pagamento de ${payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} foi marcado como ${newStatus === 'paid' ? 'pago' : 'pendente'}.` });
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
                Nenhum cliente com dados de faturamento para este mês.
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
                {data.map(({ client, payment }) => {
                    const status = payment?.status || 'pending';
                    const isUpdating = updatingId === payment?.id;

                    return (
                        <TableRow key={client.id}>
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell>
                                {payment ? format(new Date(payment.dueDate), 'dd/MM/yyyy') : `Dia ${client.dueDay}`}
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
                            <TableCell className="text-right">
                               <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={!payment || isUpdating}>
                                            {isUpdating ? <Spinner size="small" /> : <MoreHorizontal />}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {status === 'pending' ? (
                                            <DropdownMenuItem onClick={() => handleStatusChange(payment, 'paid')}>
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Marcar como Pago
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem onClick={() => handleStatusChange(payment, 'pending')}>
                                                <Clock className="mr-2 h-4 w-4" />
                                                Marcar como Pendente
                                            </DropdownMenuItem>
                                        )}
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