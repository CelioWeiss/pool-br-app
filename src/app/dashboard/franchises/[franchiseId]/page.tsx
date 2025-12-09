
"use client";

import { useMemo, useState, useEffect, useCallback, use } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Franchise, UserInfo, Client, Technician, Payment, ServiceLocation } from '@/lib/types';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, Users, Wrench } from 'lucide-react';
import { MonthlyRevenueChart } from '@/components/dashboard/charts/monthly-revenue-chart';
import { ClientStatsChart, type ClientStatsData } from '@/components/dashboard/charts/client-stats-chart';
import { subMonths, startOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: string | number, icon: React.ElementType, isLoading?: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? <div className="h-8 w-1/4 animate-pulse bg-muted rounded-md" /> : <div className="text-2xl font-bold">{value}</div>}
    </CardContent>
  </Card>
);

export default function FranchiseDetailsPage() {
  const params = use(useParams());
  const firestore = useFirestore();
  const { hasRole } = useAuth();
  
  const franchiseId = params.franchiseId as string;

  const [stats, setStats] = useState({ clients: 0, technicians: 0 });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [clientStatsData, setClientStatsData] = useState<ClientStatsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const franchiseDocRef = useMemo(() => 
    firestore && franchiseId ? doc(firestore, 'franchises', franchiseId) : null
  , [firestore, franchiseId]);
  const { data: franchise, isLoading: isLoadingFranchise } = useDoc<Franchise>(franchiseDocRef);
  
  const clientsQuery = useMemo(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'clients') : null
  , [firestore, franchiseId]);
  const { data: clientList, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const locationsQuery = useMemo(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'locations') : null
  , [firestore, franchiseId]);
  const { data: locationList, isLoading: isLoadingLocations } = useCollection<ServiceLocation>(locationsQuery);

  const fetchDashboardData = useCallback(async () => {
    if (!firestore || !franchiseId) return;
    setIsLoading(true);
    
    try {
        const monthLabels: string[] = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), 'MMM', { locale: ptBR }));
        const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

        // Stats
        const clientsSnap = await getCountFromServer(query(collection(firestore, 'franchises', franchiseId, 'clients'), where('isActive', '==', true)));
        const techniciansSnap = await getCountFromServer(collection(firestore, 'franchises', franchiseId, 'technicians'));
        const totalClients = clientsSnap.data().count;
        const totalTechnicians = techniciansSnap.data().count;

        // Client Growth
        const allClientsSnap = await getDocs(collection(firestore, 'franchises', franchiseId, 'clients'));
        const newClientsByMonth: Record<string, number> = {};
        monthLabels.forEach(m => newClientsByMonth[m] = 0);
        let inactiveCount = 0;
        allClientsSnap.forEach(doc => {
            const client = doc.data() as Client;
            if (client.isActive === false) inactiveCount++;
            if (client.createdAt) {
                const createdAtDate = new Date(client.createdAt);
                if (createdAtDate >= sixMonthsAgo) {
                    const monthKey = format(createdAtDate, 'MMM', { locale: ptBR });
                    newClientsByMonth[monthKey] = (newClientsByMonth[monthKey] || 0) + 1;
                }
            }
        });
        
        // Revenue
        const paymentsSnap = await getDocs(query(collection(firestore, 'franchises', franchiseId, 'payments'), where('dueDate', '>=', sixMonthsAgo.toISOString())));
        const revenueByMonth: Record<string, { faturado: number, recebido: number }> = {};
        monthLabels.forEach(m => revenueByMonth[m] = { faturado: 0, recebido: 0 });

        paymentsSnap.forEach(doc => {
            const payment = doc.data() as Payment;
            const monthKey = format(new Date(payment.dueDate), 'MMM', { locale: ptBR });
            if (revenueByMonth[monthKey]) {
                revenueByMonth[monthKey].faturado += payment.amount;
                if (payment.status === 'paid') {
                    revenueByMonth[monthKey].recebido += payment.amount;
                }
            }
        });

        setStats({ clients: totalClients, technicians: totalTechnicians });
        setRevenueData(monthLabels.map(month => ({ month, ...revenueByMonth[month] })));
        setClientStatsData(monthLabels.map(month => ({
            month,
            newClients: newClientsByMonth[month] || 0,
            inactiveClients: 0, // Simplified for this view
        })));

    } catch (error) {
        console.error("Error fetching franchise dashboard data:", error);
    } finally {
        setIsLoading(false);
    }
  }, [firestore, franchiseId]);

  useEffect(() => {
    if (hasRole('master')) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, hasRole]);

  const pageLoading = isLoading || isLoadingFranchise || isLoadingClients || isLoadingLocations;

  if (!hasRole('master')) {
    return <p>Acesso negado.</p>;
  }

  if (pageLoading) {
    return <div className="flex h-screen items-center justify-center"><Spinner size="large" /></div>;
  }
  
  if (!franchise) {
    return <p>Franquia não encontrada.</p>;
  }
  
  const clientsMap = new Map(clientList?.map(c => [c.id, c]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard da Franquia</h1>
        <p className="text-muted-foreground text-xl">{franchise.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Clientes Ativos" value={stats.clients} icon={Users} isLoading={pageLoading} />
        <StatCard title="Total de Técnicos" value={stats.technicians} icon={Wrench} isLoading={pageLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
            <MonthlyRevenueChart data={revenueData} isLoading={pageLoading} />
        </div>
        <div className="lg:col-span-2">
            <ClientStatsChart data={clientStatsData} isLoading={pageLoading} totalActive={stats.clients} totalInactive={0} />
        </div>
      </div>
      
       <Card>
          <CardHeader>
            <CardTitle>Saúde da Franquia</CardTitle>
            <CardDescription>Visão geral da base de clientes e locais da franquia.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLocations || isLoadingClients ? (
              <div className="flex justify-center items-center h-48"><Spinner /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Mensalidade</TableHead>
                    <TableHead>Dia Venc.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationList && locationList.length > 0 ? locationList.map((location) => {
                    const client = clientsMap.get(location.clientId);
                    if (!client) return null;
                    
                    return (
                    <TableRow key={location.id}>
                      <TableCell>
                         <Badge variant={client.isActive ? 'default' : 'destructive'} className={client.isActive ? 'bg-green-100 text-green-800' : ''}>
                          {client.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <p className="font-medium mt-1">{client.name}</p>
                      </TableCell>
                      <TableCell>{location.address}</TableCell>
                      <TableCell>{location.fee?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'N/A'}</TableCell>
                      <TableCell>{location.dueDay || 'N/A'}</TableCell>
                    </TableRow>
                  )}) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Nenhum local encontrado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
