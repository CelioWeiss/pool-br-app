"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { clients, technicians } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewClientForm } from '@/components/dashboard/clients/new-client-form';
import type { ContractType } from '@/lib/types';

export default function ClientsPage() {
  const { user, hasRole } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  if (!hasRole('owner')) {
    return <p>Acesso negado.</p>;
  }

  const franchiseClients = clients.filter(c => c.franchiseId === user?.franchiseId);
  const franchiseTechnicians = technicians.filter(t => t.franchiseId === user?.franchiseId);


  const getTechnicianName = (id: string | null) => {
    return technicians.find(t => t.id === id)?.name || 'N/A';
  }

  const contractVariant: Record<ContractType, "default" | "secondary" | "destructive"> = {
    mensal: 'default',
    quinzenal: 'secondary',
    avulso: 'destructive',
  };

  const handleClientCreated = () => {
    // Here you would refresh the client list, for now, just close the dialog
    setIsDialogOpen(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Clientes</h1>
          <p className="text-muted-foreground">Adicione e gerencie os clientes da sua franquia.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Cliente</DialogTitle>
              <DialogDescription>
                Preencha os dados abaixo para cadastrar um novo cliente.
              </DialogDescription>
            </DialogHeader>
            <NewClientForm technicians={franchiseTechnicians} onClientCreated={handleClientCreated}/>
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
              {franchiseClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.address}</TableCell>
                  <TableCell>{getTechnicianName(client.assignedTechnicianId)}</TableCell>
                  <TableCell>
                    <Badge variant={contractVariant[client.contractType]}>{client.contractType}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Editar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
