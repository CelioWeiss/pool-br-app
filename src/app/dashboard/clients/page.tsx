"use client";

import { useState } from 'react';
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
import { clients as initialClients, technicians as initialTechnicians } from '@/lib/data';

export default function ClientsPage() {
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const [clientList, setClientList] = useState<Client[]>(initialClients);
  const [franchiseTechnicians] = useState<Technician[]>(initialTechnicians);

  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  if (!hasRole('owner')) {
    return <p>Acesso negado.</p>;
  }

  const getTechnicianName = (id: string | null) => {
    if (!id) return 'N/A';
    const technician = franchiseTechnicians.find(t => t.id === id);
    return technician ? `${technician.firstName} ${technician.lastName}` : 'N/A';
  }

  const contractVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    mensal: 'default',
    quinzenal: 'secondary',
    avulso: 'destructive',
    'default': 'outline',
  };

  const handleSaveClient = (clientData: NewClientData) => {
    if (editingClient) {
        setClientList(prev => prev.map(c => c.id === editingClient.id ? { ...editingClient, ...clientData } : c));
        toast({
            title: "Cliente Atualizado!",
            description: `Os dados de ${clientData.name} foram atualizados.`,
        });
    } else {
        const newClient: Client = {
            id: `client-${Date.now()}`,
            franchiseId: 'franchise-1', // Mock franchise ID
            ...clientData
        };
        setClientList(prev => [...prev, newClient]);
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
    setIsNewClientDialogOpen(true); // Open the same dialog for editing
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
        <Dialog open={isNewClientDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingClient(null); setIsNewClientDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</DialogTitle>
              <DialogDescription>
                {editingClient ? 'Atualize os dados do cliente.' : 'Preencha os dados abaixo para cadastrar um novo cliente.'}
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
                <TableHead>Detalhes da Piscina</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientList.length > 0 ? clientList.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.address}</TableCell>
                  <TableCell>{getTechnicianName(client.technicianId)}</TableCell>
                  <TableCell>{client.poolDetails}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(client)}>Editar</Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">Nenhum cliente encontrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
