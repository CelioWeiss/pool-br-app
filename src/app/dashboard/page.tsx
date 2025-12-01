
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Wrench, Calendar } from 'lucide-react';
import { ClientDashboard } from '@/components/dashboard/client/client-dashboard';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { PendingClients } from '@/components/dashboard/pending-clients';
import { TechnicianDashboard } from '@/components/dashboard/technician/technician-dashboard';
import { MonthlyRevenueChart } from '@/components/dashboard/charts/monthly-revenue-chart';
import { ClientStatsChart, type ClientStatsData } from '@/components/dashboard/charts/client-stats-chart';
import type { Payment, Franchise } from '@/lib/types';
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

  // Memoize the current date to prevent re-renders
  const currentDate = useMemo(() => new Date(), []);

  // --- Data Fetching Hooks ---
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
  useEffect(() => {
    async function fetchStats() {
      if (!userInfo || !firestore) return;
      setIsLoading(true);
  
      let totalFranchises = 0;
      let totalClients = 0;
      let totalTechnicians = 0;
  
      try {
        const isMaster = userInfo.role === 'master';
        const isOwner = userInfo.role === 'owner';

        if (isMaster) {
          // Master user: aggregate data from all franchises
          const franchisesSnap = await getDocs(collection(firestore, 'franchises'));
          totalFranchises = franchisesSnap.size;
  
          for (const franchiseDoc of franchisesSnap.docs) {
            const currentFranchiseId = franchiseDoc.id;
            
            const clientsSnap = await getCountFromServer(
              query(
                collection(firestore, `franchises/${currentFranchiseId}/clients`),
                where('isActive', '==', true)
              )
            );
            totalClients += clientsSnap.data().count;
            
            const techniciansSnap = await getCountFromServer(
              collection(firestore, `franchises/${currentFranchiseId}/technicians`)
            );
            totalTechnicians += techniciansSnap.data().count;
          }
        } else if (isOwner && franchiseId) {
          // Owner user: get data for their own franchise
          const activeClientsSnap = await getCountFromServer(
            query(
              collection(firestore, 'franchises', franchiseId, 'clients'),
              where('isActive', '==', true)
            )
          );
          totalClients = activeClientsSnap.data().count;
  
          const techniciansSnap = await getCountFromServer(
            collection(firestore, 'franchises', franchiseId, 'technicians')
          );
          totalTechnicians = techniciansSnap.data().count;
  
          // Fetch financial and client stats data only for owners
          const now = new Date();
          const monthLabels: string[] = [];
          const revenueByMonth: Record<string, { faturado: number, recebido: number }> = {};
          
          for (let i = 5; i >= 0; i--) {
            const date = subMonths(now, i);
            const monthKey = format(date, 'MMM', { locale: ptBR });
            monthLabels.push(monthKey);
            revenueByMonth[monthKey] = { faturado: 0, recebido: 0 };
          }
          
          const sixMonthsAgo = startOfMonth(subMonths(now, 5));
          const paymentsQuery = query(
              collection(firestore, 'franchises', franchiseId, 'payments'),
              where('dueDate', '>=', sixMonthsAgo.toISOString())
          );
          const paymentsSnap = await getDocs(paymentsQuery);

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
          
          setRevenueData(monthLabels.map(month => ({ month, ...revenueByMonth[month] })));
          
          const allClientsQuery = collection(firestore, 'franchises', franchiseId, 'clients');
          const allClientsSnap = await getDocs(allClientsQuery);
          let active = 0;
          let inactive = 0;
          const newClientsByMonth: Record<string, number> = {};

          allClientsSnap.forEach(doc => {
            const client = doc.data();
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

          setTotalActiveClients(active);
          setTotalInactiveClients(inactive);
          setClientStatsData(monthLabels.map(month => ({
            month,
            newClients: newClientsByMonth[month] || 0,
            inactiveClients: 0,
          })));
        }
  
        setStats(prev => ({
          ...prev,
          franchises: totalFranchises,
          clients: totalClients,
          technicians: totalTechnicians,
        }));
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    }
  
    fetchStats();
  }, [firestore, userInfo]);

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
        {(userInfo.role === 'master' || userInfo.role === 'owner') && (
          <StatCard
            title="Clientes Ativos"
            value={stats.clients}
            icon={Users}
            isLoading={isLoading}
          />
        )}
        {(userInfo.role === 'master' || userInfo.role === 'owner') && (
          <StatCard
            title="Total de Técnicos"
            value={stats.technicians}
            icon={Wrench}
            isLoading={isLoading}
          />
        )}
        {userInfo.role === 'owner' && (
          <StatCard
            title="Serviços Agendados Hoje"
            value={stats.appointmentsToday}
            icon={Calendar}
            isLoading={isLoadingAppointments}
          />
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
