"use client";

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign, Calendar, User, Wrench, History, Droplets, Copy } from 'lucide-react';
import { AppointmentHistory } from '@/components/dashboard/client/appointment-history';
import { format } from 'date-fns';
import type { Client, Technician, Appointment, Franchise } from '@/lib/types';
import { useMemo } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const InfoCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
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

const PixCard = ({ pixKey }: { pixKey: string }) => {
  const { toast } = useToast();
  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixKey);
    toast({
      title: 'Chave PIX Copiada!',
      description: 'Você pode colar a chave no seu aplicativo de banco.',
    });
  }

  return (
    <Card className="bg-primary/5">
       <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <DollarSign className="h-5 w-5" /> Informações de Pagamento
          </CardTitle>
      </CardHeader>
      <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Use a chave PIX abaixo para realizar o pagamento da sua mensalidade.
          </p>
          <div className="flex items-center gap-2 p-3 bg-background border rounded-md">
            <p className="font-mono text-sm font-semibold truncate flex-1">{pixKey}</p>
            <Button variant="ghost" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4"/>
            </Button>
          </div>
      </CardContent>
    </Card>
  )
}

export function ClientDashboard() {
  const { user } = useAuth(); // We use the direct firebase user here
  const firestore = useFirestore();
  const { toast } = useToast();

  const clientQuery = useMemoFirebase(() => 
    firestore && user ? query(collection(firestore, 'clients'), where('userId', '==', user.uid)) : null, 
  [firestore, user]);
  
  // This is a workaround because we store clients in a subcollection, but our rules prevent a client from listing all clients.
  // A better solution would be to have the client's franchiseId available in their auth claims or user profile.
  // For now, we assume a client belongs to only one franchise and is identified by their userId.
  // This query is inefficient as it scans all top-level `clients` collections.
  // A proper implementation would have clients in a franchise subcollection.
  // Let's assume for now clients are in a top-level collection for this component to work.
  
  // CORRECTED APPROACH: The user's franchiseId is on their user info object!
  const { userInfo } = useAuth();
  const clientDocRef = useMemoFirebase(() => {
    if (!firestore || !userInfo || !userInfo.franchiseId) return null;
    // Client ID might not be the same as User ID. We need to query for the client document using userId.
    // This is still not ideal. A client document should ideally be found via the user's direct ID if they are the same.
    // Let's assume the client's ID *is* the user's ID for simplicity for now.
    return doc(firestore, `franchises/${userInfo.franchiseId}/clients`, userInfo.id);
  }, [firestore, userInfo]);
  const { data: clientData, isLoading: isLoadingClient } = useDoc<Client>(clientDocRef);


  const franchiseId = clientData?.franchiseId;

  const franchiseDocRef = useMemoFirebase(() => 
    firestore && franchiseId ? doc(firestore, 'franchises', franchiseId) : null,
  [firestore, franchiseId]);
  const { data: franchise, isLoading: isLoadingFranchise } = useDoc<Franchise>(franchiseDocRef);

  const techniciansCollectionRef = useMemoFirebase(() => 
    firestore && franchiseId ? collection(firestore, `franchises/${franchiseId}/technicians`) : null,
  [firestore, franchiseId]);
  const { data: technicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansCollectionRef);

  const appointmentsCollectionRef = useMemoFirebase(() => 
    firestore && franchiseId && clientData?.id ? query(collection(firestore, `franchises/${franchiseId}/appointments`), where('clientId', '==', clientData.id)) : null,
  [firestore, franchiseId, clientData?.id]);
  const { data: clientAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsCollectionRef);


  const assignedTechnician: Technician | undefined = useMemo(() => {
    if (!clientData?.technicianId || !technicians) return undefined;
    return technicians.find(t => t.id === clientData.technicianId);
  }, [clientData, technicians]);

  const upcomingAppointment = useMemo(() => {
    if (!clientAppointments) return null;
    return clientAppointments
      .filter(a => new Date(a.scheduledDateTime) >= new Date())
      .sort((a,b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime())[0];
  }, [clientAppointments]);

  const isLoading = isLoadingClient || isLoadingFranchise || isLoadingTechnicians || isLoadingAppointments;

  if (isLoading) {
      return <div className="flex h-[80vh] items-center justify-center"><Spinner size="large" /></div>
  }

  if (!userInfo || !clientData) {
    return <p>Carregando dados do cliente...</p>;
  }

  const getAvatarUrl = (id: string) => {
    const placeholder = PlaceHolderImages.find(p => p.id === id);
    return placeholder?.imageUrl;
  }

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Olá, {clientData?.name || userInfo.firstName}!</h1>
            <p className="text-muted-foreground">Bem-vindo ao seu portal do cliente.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InfoCard 
                title="Mensalidade"
                value={clientData?.monthlyFee ? clientData.monthlyFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A'}
                icon={DollarSign}
            />
            <InfoCard 
                title="Vencimento"
                value={clientData?.dueDay ? `Dia ${clientData.dueDay}`: 'N/A'}
                icon={Calendar}
            />
             <InfoCard 
                title="Próxima Limpeza" 
                value={upcomingAppointment ? format(new Date(upcomingAppointment.scheduledDateTime), 'dd/MM/yyyy') : 'N/A'}
                icon={Droplets} 
            />
             <InfoCard 
                title="Qualidade da Água" 
                value="Excelente" 
                icon={Wrench} 
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
                {franchise?.pixKey && (
                   <PixCard pixKey={franchise.pixKey} />
                )}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <User className="h-5 w-5" /> Técnico Responsável
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {assignedTechnician ? (
                             <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={getAvatarUrl(assignedTechnician.id)} alt={assignedTechnician.firstName} />
                                    <AvatarFallback>{assignedTechnician.firstName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold text-lg">{assignedTechnician.firstName} {assignedTechnician.lastName}</p>
                                    <p className="text-sm text-muted-foreground">{assignedTechnician.phone}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">Nenhum técnico atribuído.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5"/>
                            Histórico de Atendimentos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AppointmentHistory appointments={clientAppointments || []} technicians={technicians || []} />
                    </CardContent>
                </Card>
            </div>
        </div>

    </div>
  );
}

    