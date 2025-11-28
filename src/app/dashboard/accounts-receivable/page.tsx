
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Client, Payment } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, writeBatch, getDocs, doc, addDoc } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ReceivablesTable, type ReceivablesData } from '@/components/dashboard/accounts-receivable/receivables-table';
import { useToast } from '@/hooks/use-toast';

export default function AccountsReceivablePage() {
    const { userInfo, hasRole } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const franchiseId = userInfo?.franchiseId;

    // --- Data Fetching ---
    const clientsCollection = useMemoFirebase(() =>
        firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'clients') : null,
        [firestore, franchiseId]
    );
    const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);

    const paymentsQuery = useMemoFirebase(() => {
        if (!firestore || !franchiseId) return null;
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return query(
            collection(firestore, 'franchises', franchiseId, 'payments'),
            where('dueDate', '>=', start.toISOString()),
            where('dueDate', '<=', end.toISOString())
        );
    }, [firestore, franchiseId, currentMonth]);
    const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

    // --- Data processing and state management ---
    const [receivablesData, setReceivablesData] = useState<ReceivablesData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // --- Generate payments for the current month if they don't exist ---
    useEffect(() => {
        const generateMonthlyPayments = async () => {
            if (!clients || !franchiseId || !firestore) return;

            setIsProcessing(true);
            const month = currentMonth.getMonth() + 1;
            const year = currentMonth.getFullYear();

            const paymentDocsForMonthQuery = query(
                collection(firestore, `franchises/${franchiseId}/payments`),
                where('month', '==', month),
                where('year', '==', year)
            );
            const paymentDocsForMonthSnapshot = await getDocs(paymentDocsForMonthQuery);
            const existingClientIds = new Set(paymentDocsForMonthSnapshot.docs.map(doc => doc.data().clientId));

            const batch = writeBatch(firestore);
            let hasNewPayments = false;

            for (const client of clients) {
                if (client.monthlyFee && client.dueDay && !existingClientIds.has(client.id)) {
                    const dueDate = new Date(year, month - 1, client.dueDay);
                    const newPayment: Omit<Payment, 'id'> = {
                        franchiseId,
                        clientId: client.id,
                        amount: client.monthlyFee,
                        dueDate: dueDate.toISOString(),
                        status: 'pending',
                        month,
                        year,
                    };
                    const paymentRef = doc(collection(firestore, `franchises/${franchiseId}/payments`));
                    batch.set(paymentRef, newPayment);
                    hasNewPayments = true;
                }
            }

            if (hasNewPayments) {
                try {
                    await batch.commit();
                    toast({ title: "Pagamentos Gerados", description: "Os registros de pagamento para o mês atual foram criados." });
                } catch (error) {
                    console.error("Error generating payments:", error);
                    toast({ variant: "destructive", title: "Erro ao Gerar Pagamentos", description: "Não foi possível criar os registros de pagamento." });
                }
            }
             setIsProcessing(false);
        };

        if(!isLoadingClients) {
            generateMonthlyPayments();
        }
    }, [clients, currentMonth, franchiseId, firestore, isLoadingClients, toast]);


    // --- Combine clients and payments ---
    useEffect(() => {
        if (!clients || !payments) {
            setReceivablesData([]);
            return;
        };

        const clientsMap = new Map(clients.map(c => [c.id, c]));
        const paymentsMap = new Map(payments.map(p => [p.clientId, p]));

        const combinedData: ReceivablesData[] = clients
            .filter(client => client.monthlyFee && client.dueDay) // Only include clients with billing info
            .map(client => {
                const payment = paymentsMap.get(client.id);
                return {
                    client,
                    payment: payment || null, // payment can be null if it hasn't been created yet
                };
            });

        setReceivablesData(combinedData);
    }, [clients, payments]);


    if (!hasRole('owner') || !franchiseId) {
        return <p>Acesso negado.</p>;
    }
    
    const isLoading = isLoadingClients || isLoadingPayments || isProcessing;
    
    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contas a Receber</h1>
                    <p className="text-muted-foreground">Gerencie as mensalidades dos seus clientes.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-semibold capitalize w-48 text-center">
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign />
                        Pagamentos de {format(currentMonth, 'MMMM', { locale: ptBR })}
                    </CardTitle>
                    <CardDescription>
                        Lista de mensalidades dos clientes para o mês selecionado.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Spinner />
                            <p className="ml-4">Processando pagamentos...</p>
                        </div>
                    ) : (
                        <ReceivablesTable data={receivablesData} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

