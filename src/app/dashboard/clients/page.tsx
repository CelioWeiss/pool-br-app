"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { clients, technicians, addAppointmentsForClient, removeAppointmentsForClient } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewClientForm } from '@/components/dashboard/clients/new-client-form';
import type { ContractType, Client, NewClientData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function ClientsPage() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientList, setClientList] = useState(clients.filter(c => c.franchiseId === user?.franchiseId));
  
  if (!hasRole('owner')) {
    return <p>Acesso negado.</p>;
  }

  const franchiseTechnicians = technicians.filter(t => t.franchiseId === user?.franchiseId);


  const getTechnicianName = (id: string | null) => {
    return technicians.find(t => t.id === id)?.name || 'N/A';
  }

  const contractVariant: Record<ContractType, "default" | "secondary" | "destructive"> = {
    mensal: 'default',
    quinzenal: 'secondary',
    avulso: 'destructive',
  };

  const handleSaveClient = (clientData: NewClientData) => {
    if (editingClient) {
        // Update existing client
        const updatedClients = clientList.map(c => 
            c.id === editingClient.id ? { ...c, ...clientData } : c
        );
        setClientList(updatedClients);
        removeAppointmentsForClient(editingClient.id);
        if (clientData.assignedTechnicianId && clientData.visitDays) {
            addAppointmentsForClient(editingClient.id, clientData.assignedTechnicianId, clientData.visitDays, user?.franchiseId || '');
        }
        toast({
            title: "Cliente Atualizado!",
            description: `Os dados de ${clientData.name} foram atualizados.`,
        });
    } else {
        // Add new client
        const newClient: Client = {
            id: `client-${Date.now()}`,
            franchiseId: user?.franchiseId || '',
            ...clientData
        };
        setClientList(prev => [...prev, newClient]);
        if (newClient.assignedTechnicianId && newClient.visitDays) {
             addAppointmentsForClient(newClient.id, newClient.assignedTechnicianId, newClient.visitDays, newClient.franchiseId);
        }
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
        <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
              technicians={franchiseTechnicians} 
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
              {clientList.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.address}</TableCell>
                  <TableCell>{getTechnicianName(client.assignedTechnicianId)}</TableCell>
                  <TableCell>
                    <Badge variant={contractVariant[client.contractType]}>{client.contractType}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(client)}>Editar</Button>
                  </TableCell>
                </TableRow>
              ))}
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
                technicians={franchiseTechnicians} 
                onSave={handleSaveClient}
                onCancel={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
    </div>
  );
}
