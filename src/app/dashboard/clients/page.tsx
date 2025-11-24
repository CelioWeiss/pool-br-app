"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewClientForm } from '@/components/dashboard/clients/new-client-form';
import type { ContractType, Client, NewClientData, Technician } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

export default function ClientsPage() {
  const { user, hasRole, userInfo } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const clientsQuery = useMemoFirebase(() => {
    if (!userInfo?.franchiseId) return null;
    return collection(firestore, 'franchises', userInfo.franchiseId, 'clients');
  }, [firestore, userInfo?.franchiseId]);
  
  const { data: clientList, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  const techniciansQuery = useMemoFirebase(() => {
      if (!userInfo?.franchiseId) return null;
      return collection(firestore, 'franchises', userInfo.franchiseId, 'technicians');
  }, [firestore, userInfo?.franchiseId]);

  const { data: franchiseTechnicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansQuery);

  if (!hasRole('owner')) {
    return <p>Acesso negado.</p>;
  }

  const getTechnicianName = (id: string | null) => {
    if (!franchiseTechnicians) return 'N/A';
    return franchiseTechnicians.find(t => t.id === id)?.name || 'N/A';
  }

  const contractVariant: Record<ContractType, "default" | "secondary" | "destructive" | "outline"> = {
    mensal: 'default',
    quinzenal: 'secondary',
    avulso: 'destructive',
    'default': 'outline',
  };

  const handleSaveClient = (clientData: NewClientData) => {
    if (!userInfo?.franchiseId) {
        toast({
            variant: "destructive",
            title: "Erro",
            description: "ID da franquia não encontrado.",
        });
        return;
    }

    if (editingClient) {
        const clientRef = doc(firestore, 'franchises', userInfo.franchiseId, 'clients', editingClient.id);
        setDocumentNonBlocking(clientRef, clientData, { merge: true });
        toast({
            title: "Cliente Atualizado!",
            description: `Os dados de ${clientData.name} foram atualizados.`,
        });
    } else {
        const clientsCol = collection(firestore, 'franchises', userInfo.franchiseId, 'clients');
        addDocumentNonBlocking(clientsCol, { ...clientData, franchiseId: userInfo.franchiseId });
        toast({
            title: "Cliente Criado!",
            description: `O cliente ${clientData.name} foi adicionado com sucesso.`,
        });
    }
    
    setIsNewClientDialogOpen(false);
    setEditingClient(null);
  }
  
  const handleEditClick = (client: Client) => {
    setEditingClient(client);
  }
  
  const handleCloseDialog = () => {
    setEditingClient(null);
    setIsNewClientDialogOpen(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Clientes</h1>
          <p className="text-muted-foreground">Adicione e gerencie os clientes da sua franquia.</p>
        </div>
        <Dialog open={isNewClientDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) handleCloseDialog()}}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsNewClientDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Cliente</DialogTitle>
              <DialogDescription>
                Preencha os dados abaixo para cadastrar um novo cliente.
              </DialogDescription>
            </DialogHeader>
            <NewClientForm 
              technicians={franchiseTechnicians || []} 
              onSave={handleSaveClient}
              onCancel={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>Lista de clientes da sua franquia.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingClients && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">Carregando clientes...</TableCell>
                </TableRow>
              )}
              {!isLoadingClients && clientList && clientList.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.address}</TableCell>
                  <TableCell>{getTechnicianName(client.assignedTechnicianId)}</TableCell>
                  <TableCell>
                    <Badge variant={client.contractType ? contractVariant[client.contractType] : 'outline'}>{client.contractType || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(client)}>Editar</Button>
                  </TableCell>
                </TableRow>
              ))}
               {!isLoadingClients && (!clientList || clientList.length === 0) && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">Nenhum cliente encontrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       <Dialog open={!!editingClient} onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>
                Atualize os dados do cliente.
              </DialogDescription>
            </DialogHeader>
            <NewClientForm 
                client={editingClient}
                technicians={franchiseTechnicians || []} 
                onSave={handleSaveClient}
                onCancel={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
    </div>
  );
}
