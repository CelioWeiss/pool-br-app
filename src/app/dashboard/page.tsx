'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Wrench, Calendar } from 'lucide-react';
import { ClientDashboard } from '@/components/dashboard/client/client-dashboard';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { PendingClients } from '@/components/dashboard/pending-clients';
import { TechnicianDashboard } from '@/components/dashboard/technician/technician-dashboard';
import { MonthlyRevenueChart, type MonthlyRevenueData } from '@/components/dashboard/charts/monthly-revenue-chart';
import { ClientStatsChart, type ClientStatsData } from '@/components/dashboard/charts/client-stats-chart';
import type { Client, Payment, ServiceLocation, Appointment } from '@/lib/types';
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
  const { userInfo, hasRole } = useAuth();
  const firestore = useFirestore();

  const franchiseId = userInfo?.franchiseId;

  // --- Data Fetching Hooks ---
  const {
    allAppointments,
    isLoading: isLoadingAppointments
  } = useUnifiedAppointments(franchiseId, new Date());


  const [stats, setStats] = useState({
    franchises: 0,
    clients: 0,
    technicians: 0,
    appointmentsToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<MonthlyRevenueData[]>([]);
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
  useEffect(() => {
    async function fetchStats() {
      if (!userInfo || !firestore || !franchiseId) return;
      setIsLoading(true);

      const counts = {
        franchises: 0,
        clients: 0,
        technicians: 0,
      };

      try {
        if (hasRole('master')) {
          const franchisesSnap = await getCountFromServer(
            collection(firestore, 'franchises')
          );
          counts.franchises = franchisesSnap.data().count;
        }

        if (hasRole(['master', 'owner'])) {
          const activeClientsQuery = query(
            collection(firestore, 'franchises', franchiseId, 'clients'),
            where('isActive', '==', true)
          );
          const activeClientsSnap = await getCountFromServer(activeClientsQuery);
          counts.clients = activeClientsSnap.data().count;

          const techniciansQuery = query(
            collection(
              firestore,
              'franchises',
              franchiseId,
              'technicians'
            )
          );
          const techniciansSnap = await getCountFromServer(techniciansQuery);
          counts.technicians = techniciansSnap.data().count;
        }

        if (hasRole(['owner'])) {
           // Fetch data for charts
          const now = new Date();
          const revenuePromises: Promise<{ faturado: number, recebido: number }>[] = [];
          const clientStatsPromises: Promise<{ new: number, inactive: number }>[] = [];
          const monthLabels: string[] = [];
          
          for (let i = 5; i >= 0; i--) {
            const date = subMonths(now, i);
            monthLabels.push(format(date, 'MMM', { locale: ptBR }));

            const start = startOfMonth(date);
            const end = endOfMonth(date);

            // Revenue
            const paymentsQuery = query(
              collection(firestore, 'franchises', franchiseId, 'payments'),
              where('dueDate', '>=', start.toISOString()),
              where('dueDate', '<=', end.toISOString())
            );
            revenuePromises.push(
                getDocs(paymentsQuery).then(snap => {
                    let faturado = 0;
                    let recebido = 0;
                    snap.docs.forEach(doc => {
                        const payment = doc.data() as Payment;
                        faturado += payment.amount;
                        if (payment.status === 'paid') {
                            recebido += payment.amount;
                        }
                    });
                    return { faturado, recebido };
                })
            );

            // Client stats
            const clientsRef = collection(firestore, 'franchises', franchiseId, 'clients');
            const newClientsQuery = query(clientsRef, where('createdAt', '>=', start.toISOString()), where('createdAt', '<=', end.toISOString()));
            const inactiveClientsQuery = query(clientsRef, where('isActive', '==', false)); // Simplified: checks all inactive, not just in that month
            
            clientStatsPromises.push(Promise.all([
              getDocs(newClientsQuery).then(snap => snap.size),
              getDocs(inactiveClientsQuery).then(snap => snap.size)
            ]).then(([newCount, inactiveCount]) => ({ new: newCount, inactive: inactiveCount })));
          }

          const revenueResults = await Promise.all(revenuePromises);
          setRevenueData(monthLabels.map((month, index) => ({ 
            month, 
            faturado: revenueResults[index].faturado,
            recebido: revenueResults[index].recebido,
          })));

          const clientStatsResults = await Promise.all(clientStatsPromises);
           setClientStatsData(monthLabels.map((month, index) => ({
            month,
            newClients: clientStatsResults[index].new,
            inactiveClients: clientStatsResults[index].inactive, // This is an approximation
          })));

          const allClientsQuery = collection(firestore, 'franchises', franchiseId, 'clients');
          const allClientsSnap = await getDocs(allClientsQuery);
          let active = 0;
          let inactive = 0;
          allClientsSnap.forEach(doc => {
            if (doc.data().isActive) active++;
            else inactive++;
          });
          setTotalActiveClients(active);
          setTotalInactiveClients(inactive);
        }
        
        setStats(prev => ({
          ...prev,
          franchises: counts.franchises,
          clients: counts.clients,
          technicians: counts.technicians,
        }));
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [firestore, userInfo, hasRole, franchiseId]);

  if (!userInfo) return null;

  if (hasRole('client')) {
    return <ClientDashboard />;
  }

  if (hasRole('technician')) {
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
        {hasRole('master') && (
          <StatCard
            title="Total de Franquias"
            value={stats.franchises}
            icon={Building2}
            isLoading={isLoading}
          />
        )}
        {hasRole(['master', 'owner']) && (
          <StatCard
            title="Clientes Ativos"
            value={stats.clients}
            icon={Users}
            isLoading={isLoading}
          />
        )}
        {hasRole(['master', 'owner']) && (
          <StatCard
            title="Total de Técnicos"
            value={stats.technicians}
            icon={Wrench}
            isLoading={isLoading}
          />
        )}
        {hasRole(['owner']) && (
          <StatCard
            title="Serviços Agendados Hoje"
            value={stats.appointmentsToday}
            icon={Calendar}
            isLoading={isLoadingAppointments}
          />
        )}
      </div>

       {hasRole('owner') && (
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
        {hasRole('owner') && userInfo.franchiseId && <PendingClients franchiseId={userInfo.franchiseId} />}
      </div>
    </div>
  );
}
