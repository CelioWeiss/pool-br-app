
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Wrench, Calendar } from 'lucide-react';
import { ClientDashboard } from '@/components/dashboard/client/client-dashboard';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { PendingClients } from '@/components/dashboard/pending-clients';
import { TechnicianDashboard } from '@/components/dashboard/technician/technician-dashboard';
import { MonthlyRevenueChart } from '@/components/dashboard/charts/monthly-revenue-chart';
import { ClientStatsChart, type ClientStatsData } from '@/components/dashboard/charts/client-stats-chart';
import type { Payment, Franchise, UserInfo } from '@/lib/types';
import { subMonths, startOfMonth, endOfMonth, format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUnifiedAppointments } from '@/hooks/use-unified-appointments';


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

export default function DashboardPage() {
  const { userInfo } = useAuth();
  const firestore = useFirestore();
  const franchiseId = userInfo?.franchiseId;
  const currentDate = useMemo(() => new Date(), []);

  // --- Data Fetching ---
  const {
    allAppointments,
    isLoading: isLoadingAppointments
  } = useUnifiedAppointments(franchiseId, currentDate);

  const [stats, setStats] = useState({
    franchises: 0,
    clients: 0,
    technicians: 0,
    appointmentsToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [clientStatsData, setClientStatsData] = useState<ClientStatsData[]>([]);
  const [totalActiveClients, setTotalActiveClients] = useState(0);
  const [totalInactiveClients, setTotalInactiveClients] = useState(0);


  // --- Appointment Stats Calculation ---
  useEffect(() => {
    if (isLoadingAppointments || !allAppointments) return;
    
    const todaysAppointments = allAppointments.filter(appt => 
        isToday(new Date(appt.scheduledDateTime)) && appt.status === 'scheduled'
    ).length;

    setStats(prev => ({...prev, appointmentsToday: todaysAppointments }));

  }, [allAppointments, isLoadingAppointments]);

  // --- General and Chart Stats Fetching ---
    const fetchStats = useCallback(async () => {
        if (!userInfo || !firestore) return;
        setIsLoading(true);
    
        try {
            const isMaster = userInfo.role === 'master';
            const isOwner = userInfo.role === 'owner';

            if (isMaster) {
                const franchisesQuery = collection(firestore, 'franchises');
                const franchisesSnap = await getDocs(franchisesQuery);
                setStats(prev => ({ ...prev, franchises: franchisesSnap.size, clients: 0, technicians: 0, appointmentsToday: 0 }));
            }

            if (isOwner && franchiseId) {
                // Client Stats
                const franchiseClientsQuery = query(collection(firestore, 'franchises', franchiseId, 'clients'));
                const allClientsSnap = await getDocs(franchiseClientsQuery);
                let active = 0;
                let inactive = 0;
                const newClientsByMonth: Record<string, number> = {};
                const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

                allClientsSnap.forEach(doc => {
                    const client = doc.data() as UserInfo;
                    if (client.isActive) active++;
                    else inactive++;

                    if (client.createdAt) {
                        const createdAtDate = new Date(client.createdAt);
                        if (createdAtDate >= sixMonthsAgo) {
                            const monthKey = format(createdAtDate, 'MMM', { locale: ptBR });
                            newClientsByMonth[monthKey] = (newClientsByMonth[monthKey] || 0) + 1;
                        }
                    }
                });
                setStats(prev => ({ ...prev, clients: active }));
                setTotalActiveClients(active);
                setTotalInactiveClients(inactive);

                const monthLabels: string[] = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), 'MMM', { locale: ptBR }));
                setClientStatsData(monthLabels.map(month => ({
                    month,
                    newClients: newClientsByMonth[month] || 0,
                    inactiveClients: 0,
                })));
                
                // Technician Stats
                const franchiseTechniciansQuery = query(collection(firestore, 'franchises', franchiseId, 'technicians'));
                const techniciansSnap = await getCountFromServer(franchiseTechniciansQuery);
                setStats(prev => ({ ...prev, technicians: techniciansSnap.data().count }));
                

                // Revenue Stats
                const sixMonthsAgoForPayments = startOfMonth(subMonths(new Date(), 5));
                const franchisePaymentsQuery = query(
                    collection(firestore, 'franchises', franchiseId, 'payments'),
                    where('dueDate', '>=', sixMonthsAgoForPayments.toISOString())
                );
                const paymentsSnap = await getDocs(franchisePaymentsQuery);
                const revenueMonthLabels: string[] = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), 'MMM', { locale: ptBR }));
                const revenueByMonth: Record<string, { faturado: number, recebido: number }> = {};
                revenueMonthLabels.forEach(m => revenueByMonth[m] = { faturado: 0, recebido: 0 });

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
                setRevenueData(revenueMonthLabels.map(month => ({ month, ...revenueByMonth[month] })));
            }
    
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userInfo?.role, franchiseId, firestore]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);


  if (!userInfo) return null;

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {userInfo.role === 'master' && (
          <StatCard
            title="Total de Franquias"
            value={stats.franchises}
            icon={Building2}
            isLoading={isLoading}
          />
        )}
        {(userInfo.role === 'owner') && (
          <>
            <StatCard
              title="Clientes Ativos"
              value={stats.clients}
              icon={Users}
              isLoading={isLoading}
            />
            <StatCard
              title="Total de Técnicos"
              value={stats.technicians}
              icon={Wrench}
              isLoading={isLoading}
            />
            <StatCard
              title="Serviços Agendados Hoje"
              value={stats.appointmentsToday}
              icon={Calendar}
              isLoading={isLoadingAppointments}
            />
          </>
        )}
      </div>

       {userInfo.role === 'owner' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
                <MonthlyRevenueChart data={revenueData} isLoading={isLoading} />
            </div>
             <div className="lg:col-span-2">
                <ClientStatsChart 
                    data={clientStatsData} 
                    isLoading={isLoading}
                    totalActive={totalActiveClients}
                    totalInactive={totalInactiveClients}
                />
            </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {userInfo.role === 'owner' && userInfo.franchiseId && <PendingClients franchiseId={userInfo.franchiseId} />}
      </div>
    </div>
  );
}
