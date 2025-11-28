'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Wrench, Calendar } from 'lucide-react';
import { ClientDashboard } from '@/components/dashboard/client/client-dashboard';
import { useFirestore } from '@/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { PendingClients } from '@/components/dashboard/pending-clients';

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

  const [stats, setStats] = useState({
    franchises: 0,
    clients: 0,
    technicians: 0,
    appointments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    async function fetchStats() {
      if (!userInfo || !firestore) return;
      setIsLoading(true);

      const counts = {
        franchises: 0,
        clients: 0,
        technicians: 0,
        appointments: 0,
      };

      try {
        if (hasRole('master')) {
          const franchisesSnap = await getCountFromServer(
            collection(firestore, 'franchises')
          );
          counts.franchises = franchisesSnap.data().count;
        }

        if (hasRole(['master', 'owner']) && userInfo.franchiseId) {
          const clientsQuery = query(
            collection(firestore, 'franchises', userInfo.franchiseId, 'clients')
          );
          const clientsSnap = await getCountFromServer(clientsQuery);
          counts.clients = clientsSnap.data().count;

          const techniciansQuery = query(
            collection(
              firestore,
              'franchises',
              userInfo.franchiseId,
              'technicians'
            )
          );
          const techniciansSnap = await getCountFromServer(techniciansQuery);
          counts.technicians = techniciansSnap.data().count;
        }

        if (hasRole(['owner', 'technician']) && userInfo.franchiseId) {
          const apptQuery = query(
            collection(
              firestore,
              'franchises',
              userInfo.franchiseId,
              'appointments'
            ),
            where('status', '==', 'scheduled')
          );
          const apptSnap = await getCountFromServer(apptQuery);
          counts.appointments = apptSnap.data().count;
        }

        setStats(counts);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [firestore, userInfo, hasRole]);

  if (!userInfo) return null;

  if (hasRole('client')) {
    return <ClientDashboard />;
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
            title="Total de Clientes"
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
        {hasRole(['owner', 'technician']) && (
          <StatCard
            title="Serviços Agendados"
            value={stats.appointments}
            icon={Calendar}
            isLoading={isLoading}
          />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {hasRole('owner') && userInfo.franchiseId && <PendingClients franchiseId={userInfo.franchiseId} />}
      </div>
    </div>
  );
}
