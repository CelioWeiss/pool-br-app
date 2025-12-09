
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Wrench, Calendar, DollarSign } from 'lucide-react';
import { ClientDashboard } from '@/components/dashboard/client/client-dashboard';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { PendingClients } from '@/components/dashboard/pending-clients';
import { TechnicianDashboard } from '@/components/dashboard/technician/technician-dashboard';
import { MonthlyRevenueChart } from '@/components/dashboard/charts/monthly-revenue-chart';
import { ClientStatsChart, type ClientStatsData } from '@/components/dashboard/charts/client-stats-chart';
import type { Payment, Franchise, UserInfo, Client, Appointment, ServiceLocation } from '@/lib/types';
import { subMonths, startOfMonth, format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUnifiedAppointments } from '@/hooks/use-unified-appointments';
import { Spinner } from '@/components/ui/spinner';


const StatCard = ({
  title,
  value,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  isLoading?: boolean;
}) => (
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

function MasterDashboard() {
    const firestore = useFirestore();
    const [stats, setStats] = useState({ franchises: 0, clients: 0, technicians: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [revenueData, setRevenueData] = useState<any[]>([]);

    const { data: allFranchises, isLoading: isLoadingFranchises } = useCollection<Franchise>(
        useMemo(() => firestore ? collection(firestore, 'franchises') : null, [firestore])
    );
    const { data: allUsers, isLoading: isLoadingUsers } = useCollection<UserInfo>(
        useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore])
    );
    
    useEffect(() => {
        const fetchMasterStats = async () => {
            if (isLoadingFranchises || isLoadingUsers || !allFranchises || !allUsers || !firestore) return;
            setIsLoading(true);

            const newStats = {
                franchises: allFranchises.length,
                clients: allUsers.filter(u => u.role === 'client').length,
                technicians: allUsers.filter(u => u.role === 'technician').length,
            };

            const monthLabels: string[] = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), 'MMM', { locale: ptBR }));
            const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
            const revenueByMonth: Record<string, { faturado: number, recebido: number }> = {};
            monthLabels.forEach(m => revenueByMonth[m] = { faturado: 0, recebido: 0 });

            await Promise.all(allFranchises.map(async (f) => {
                if (!f.id) return;
                const paymentsSnap = await getDocs(query(collection(firestore, 'franchises', f.id, 'payments'), where('dueDate', '>=', sixMonthsAgo.toISOString())));
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
            }));
            
            setStats(newStats);
            setRevenueData(monthLabels.map(month => ({ month, ...revenueByMonth[month] })));
            setIsLoading(false);
        };
        fetchMasterStats();
    }, [allFranchises, allUsers, firestore, isLoadingFranchises, isLoadingUsers]);
    
    const pageLoading = isLoading || isLoadingFranchises || isLoadingUsers;

    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total de Franquias" value={stats.franchises} icon={Building2} isLoading={pageLoading} />
                <StatCard title="Clientes Totais" value={stats.clients} icon={Users} isLoading={pageLoading} />
                <StatCard title="Técnicos Totais" value={stats.technicians} icon={Wrench} isLoading={pageLoading} />
            </div>
            <div className="lg:col-span-3">
                 <MonthlyRevenueChart data={revenueData} isLoading={pageLoading} isMaster={true} />
            </div>
        </div>
    )
}

function OwnerDashboard({ franchiseId }: { franchiseId: string }) {
    const firestore = useFirestore();
    const currentDate = useMemo(() => new Date(), []);
    const [isLoading, setIsLoading] = useState(true);

    const [stats, setStats] = useState({ clients: 0, technicians: 0, appointmentsToday: 0, monthlyRevenue: 0 });
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [clientStatsData, setClientStatsData] = useState<ClientStatsData[]>([]);
    const [totalActiveClients, setTotalActiveClients] = useState(0);
    const [totalInactiveClients, setTotalInactiveClients] = useState(0);

    const { allAppointments, isLoading: isLoadingAppointments } = useUnifiedAppointments(franchiseId, currentDate);
    
    const fetchStats = useCallback(async () => {
        if (!firestore || !franchiseId) return;
        setIsLoading(true);

        try {
            const allClientsSnap = await getDocs(query(collection(firestore, 'franchises', franchiseId, 'clients')));
            const allClients = allClientsSnap.docs.map(doc => doc.data() as Client);
            
            const locationsSnap = await getDocs(query(collection(firestore, 'franchises', franchiseId, 'locations')));
            const allLocations = locationsSnap.docs.map(doc => doc.data() as ServiceLocation);

            const activeClientIds = new Set(allClients.filter(c => c.isActive !== false).map(c => c.id));
            
            let activeClientsCount = 0;
            let inactiveClientsCount = 0;
            let monthlyRevenue = 0;
            
            allClients.forEach(client => {
                if (client.isActive !== false) {
                    activeClientsCount++;
                } else {
                    inactiveClientsCount++;
                }
            });

            allLocations.forEach(location => {
                if(location.fee && activeClientIds.has(location.clientId)) {
                    monthlyRevenue += location.fee;
                }
            });

            const franchiseTechniciansQuery = query(collection(firestore, 'franchises', franchiseId, 'technicians'));
            const techniciansSnap = await getCountFromServer(franchiseTechniciansQuery);
            const totalTechnicians = techniciansSnap.data().count;

            const todaysAppointments = allAppointments.filter(appt => 
              isToday(new Date(appt.scheduledDateTime)) && appt.status === 'scheduled'
            ).length;
            
            setStats({
                clients: activeClientsCount,
                monthlyRevenue: monthlyRevenue,
                technicians: totalTechnicians,
                appointmentsToday: todaysAppointments,
            });
            setTotalActiveClients(activeClientsCount);
            setTotalInactiveClients(inactiveClientsCount);
            
            const monthLabels: string[] = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), 'MMM', { locale: ptBR }));
            const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
            const newClientsByMonth: Record<string, number> = {};
            monthLabels.forEach(m => newClientsByMonth[m] = 0);
            
             allClients.forEach(client => {
                if (client.createdAt) {
                    const createdAtDate = new Date(client.createdAt);
                    if (createdAtDate >= sixMonthsAgo) {
                        const monthKey = format(createdAtDate, 'MMM', { locale: ptBR });
                        newClientsByMonth[monthKey] = (newClientsByMonth[monthKey] || 0) + 1;
                    }
                }
            });
            setClientStatsData(monthLabels.map(month => ({ month, newClients: newClientsByMonth[month] || 0, inactiveClients: 0 })));

            const revenueByMonth: Record<string, { faturado: number, recebido: number }> = {};
            monthLabels.forEach(m => revenueByMonth[m] = { faturado: 0, recebido: 0 });

            const paymentsSnap = await getDocs(query(collection(firestore, 'franchises', franchiseId, 'payments'), where('dueDate', '>=', sixMonthsAgo.toISOString())));
            paymentsSnap.forEach(doc => {
              const payment = doc.data() as Payment;
              const monthKey = format(new Date(payment.dueDate), 'MMM', { locale: ptBR });
              if(revenueByMonth[monthKey]) {
                revenueByMonth[monthKey].faturado += payment.amount;
                if (payment.status === 'paid') {
                    revenueByMonth[monthKey].recebido += payment.amount;
                }
              }
            });
            setRevenueData(monthLabels.map(month => ({ month, ...revenueByMonth[month] })));

        } catch (error) {
            console.error('Error fetching owner stats:', error);
        } finally {
            setIsLoading(false);
        }
    }, [firestore, franchiseId, allAppointments]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const pageLoading = isLoading || isLoadingAppointments;

     return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Faturamento Mensal" value={stats.monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={DollarSign} isLoading={pageLoading} />
                <StatCard title="Clientes Ativos" value={stats.clients} icon={Users} isLoading={pageLoading} />
                <StatCard title="Total de Técnicos" value={stats.technicians} icon={Wrench} isLoading={pageLoading} />
                <StatCard title="Serviços Agendados Hoje" value={stats.appointmentsToday} icon={Calendar} isLoading={pageLoading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <MonthlyRevenueChart data={revenueData} isLoading={pageLoading} />
                </div>
                <div className="lg:col-span-2">
                    <ClientStatsChart data={clientStatsData} isLoading={pageLoading} totalActive={totalActiveClients} totalInactive={totalInactiveClients} />
                </div>
            </div>
            
             <div className="grid gap-6 md:grid-cols-2">
                <PendingClients franchiseId={franchiseId} />
            </div>
        </div>
    )
}


export default function DashboardPage() {
  const { userInfo, isUserLoading } = useAuth();
  
  if (isUserLoading || !userInfo) {
      return (
        <div className="flex h-[80vh] items-center justify-center">
            <Spinner size="large" />
        </div>
      )
  }

  if (userInfo.role === 'client') {
    return <ClientDashboard />;
  }

  if (userInfo.role === 'technician') {
    return <TechnicianDashboard />;
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bem-vindo, {userInfo.firstName}!
        </h1>
        <p className="text-muted-foreground">
          Aqui está um resumo da sua operação.
        </p>
      </div>

       {userInfo.role === 'master' && <MasterDashboard />}
       {userInfo.role === 'owner' && userInfo.franchiseId && <OwnerDashboard franchiseId={userInfo.franchiseId} />}
    </div>
  );
}
