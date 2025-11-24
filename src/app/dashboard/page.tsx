"use client";

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Wrench, Calendar, Droplets } from 'lucide-react';
import { clients, franchises, technicians, appointments } from '@/lib/data';

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const { user, hasRole } = useAuth();

  if (!user) return null;

  const today = new Date();
  const upcomingAppointments = appointments.filter(a => new Date(a.date) >= today).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bem-vindo, {user.name}!</h1>
        <p className="text-muted-foreground">Aqui está um resumo da sua operação.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {hasRole('master') && (
          <StatCard title="Total de Franquias" value={franchises.length} icon={Building2} />
        )}
        {hasRole(['master', 'owner']) && (
          <StatCard title="Total de Clientes" value={clients.length} icon={Users} />
        )}
        {hasRole(['master', 'owner']) && (
          <StatCard title="Total de Técnicos" value={technicians.length} icon={Wrench} />
        )}
        {hasRole(['owner', 'technician']) && (
          <StatCard title="Serviços Agendados" value={upcomingAppointments} icon={Calendar} />
        )}
         {hasRole('client') && (
          <StatCard title="Próxima Limpeza" value={new Date(new Date().setDate(today.getDate() + 3)).toLocaleDateString()} icon={Calendar} />
        )}
         {hasRole('client') && (
          <StatCard title="Qualidade da Água" value="Excelente" icon={Droplets} />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
          {/* We can add charts or recent activity here in the future */}
      </div>
    </div>
  );
}
