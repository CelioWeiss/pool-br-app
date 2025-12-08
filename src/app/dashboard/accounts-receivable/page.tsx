
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Client, Payment, ServiceLocation } from '@/lib/types';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, writeBatch, getDocs, doc, addDoc, updateDoc } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ReceivablesTable, type ReceivablesData } from '@/components/dashboard/accounts-receivable/receivables-table';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


export default function AccountsReceivablePage() {
    const { userInfo, hasRole } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [receivablesData, setReceivablesData] = useState<ReceivablesData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [clientToDeactivate, setClientToDeactivate] = useState<Client | null>(null);
    
    const franchiseId = userInfo?.franchiseId;

    // --- Data Fetching ---
    const locationsQuery = useMemo(() =>
        firestore && franchiseId ? query(collection(firestore, 'franchises', franchiseId, 'locations')) : null,
        [firestore, franchiseId]
    );
    const { data: locations, isLoading: isLoadingLocations } = useCollection<ServiceLocation>(locationsQuery);
    
    const clientsQuery = useMemo(() =>
        firestore && franchiseId ? query(collection(firestore, 'franchises', franchiseId, 'clients')) : null,
        [firestore, franchiseId]
    );
    const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

    const paymentsQuery = useMemo(() => {
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

    
    // --- Generate payments for the current month if they don't exist ---
    useEffect(() => {
        const generateMonthlyPayments = async () => {
            if (!locations || !franchiseId || !firestore || !clients) return;
            
            const activeClients = clients.filter(c => c.isActive);
            const activeClientIds = new Set(activeClients.map(c => c.id));
            const locationsToBill = locations.filter(l => activeClientIds.has(l.clientId) && l.fee && l.dueDay);
            
            if(locationsToBill.length === 0) return;

            setIsProcessing(true);
            const month = currentMonth.getMonth() + 1;
            const year = currentMonth.getFullYear();

            const paymentDocsForMonthQuery = query(
                collection(firestore, `franchises/${franchiseId}/payments`),
                where('month', '==', month),
                where('year', '==', year)
            );
            const paymentDocsForMonthSnapshot = await getDocs(paymentDocsForMonthQuery);
            const existingLocationIds = new Set(paymentDocsForMonthSnapshot.docs.map(doc => doc.data().locationId));

            const batch = writeBatch(firestore);
            let hasNewPayments = false;

            for (const location of locationsToBill) {
                if (location.fee && location.dueDay && !existingLocationIds.has(location.id)) {
                    const dueDate = new Date(year, month - 1, location.dueDay);
                    const newPayment: Omit<Payment, 'id'> = {
                        franchiseId,
                        clientId: location.clientId,
                        locationId: location.id,
                        amount: location.fee,
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

        if(!isLoadingLocations && !isLoadingClients) {
            generateMonthlyPayments();
        }
    }, [locations, clients, currentMonth, franchiseId, firestore, isLoadingLocations, isLoadingClients, toast]);


    // --- Combine locations, clients and payments ---
    useEffect(() => {
        if (!clients || !payments || !locations) {
            setReceivablesData([]);
            return;
        };

        const clientsMap = new Map(clients.map(c => [c.id, c]));
        const paymentsMap = new Map(payments.map(p => [p.locationId, p]));

        // Create a set of location IDs that have payments this month
        const locationsWithPaymentsThisMonth = new Set(payments.map(p => p.locationId));

        // Filter locations: show locations for active clients OR inactive clients that have a payment record for the current month
        const filteredLocations = locations.filter(location => {
            const client = clientsMap.get(location.clientId);
            return (client && client.isActive) || locationsWithPaymentsThisMonth.has(location.id);
        });

        const combinedData: ReceivablesData[] = filteredLocations
            .filter(location => location.fee && location.dueDay) // Only include locations with billing info
            .map(location => {
                const client = clientsMap.get(location.clientId);
                const payment = paymentsMap.get(location.id);
                return {
                    client: client!,
                    location: location,
                    payment: payment || null,
                };
            }).filter(item => !!item.client);

        setReceivablesData(combinedData);
    }, [clients, payments, locations]);
    
    const handleDeactivateClient = async () => {
        if (!clientToDeactivate || !firestore || !franchiseId) return;

        const clientRef = doc(firestore, 'franchises', franchiseId, 'clients', clientToDeactivate.id);
        try {
            await updateDoc(clientRef, { isActive: false });
            
            // Optionally deactivate the user profile as well
            if (clientToDeactivate.userId) {
                const userRef = doc(firestore, 'users', clientToDeactivate.userId);
                await updateDoc(userRef, { isActive: false });
            }

            toast({
                title: "Cliente Inativado!",
                description: `${clientToDeactivate.name} foi marcado como inativo e não será incluído em faturas futuras.`,
            });
        } catch (error) {
            console.error("Error deactivating client: ", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível inativar o cliente." });
        } finally {
            setClientToDeactivate(null);
        }
    };


    if (!hasRole('owner') || !franchiseId) {
        return <p>Acesso negado.</p>;
    }
    
    const isLoading = isLoadingClients || isLoadingPayments || isProcessing || isLoadingLocations;
    
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
                        <ReceivablesTable 
                            data={receivablesData} 
                            onDeactivateClient={setClientToDeactivate}
                        />
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!clientToDeactivate} onOpenChange={(open) => !open && setClientToDeactivate(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Inativar Cliente?</AlertDialogTitle>
                    <AlertDialogDescription>
                    Esta ação marcará o cliente <span className="font-bold">{clientToDeactivate?.name}</span> como inativo. Ele não aparecerá em faturamentos futuros, mas o registro deste mês será mantido. Deseja continuar?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setClientToDeactivate(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeactivateClient} className={buttonVariants({ variant: "destructive" })}>Inativar</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

    