
"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewClientForm } from '@/components/dashboard/clients/new-client-form';
import type { Client, NewClientData, Technician } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';


export default function ClientsPage() {
  const { userInfo, hasRole } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();

  const franchiseId = userInfo?.franchiseId;

  const clientsCollection = useMemoFirebase(() => 
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'clients') : null
  , [firestore, franchiseId]);
  
  const techniciansCollection = useMemoFirebase(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'technicians') : null
  , [firestore, franchiseId]);

  const { data: clientList, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);
  const { data: franchiseTechnicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansCollection);

  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  if (!hasRole('owner') || !franchiseId) {
    return <p>Acesso negado.</p>;
  }

  const getTechnicianName = (id: string | null) => {
    if (!id || !franchiseTechnicians) return 'N/A';
    const technician = franchiseTechnicians.find(t => t.id === id);
    return technician ? `${technician.firstName} ${technician.lastName}` : 'N/A';
  }

  const handleSaveClient = async (clientData: NewClientData) => {
    if (!firestore || !franchiseId) return;
  
    try {
      if (editingClient) {
        // Update existing client
        const clientRef = doc(firestore, 'franchises', franchiseId, 'clients', editingClient.id);
        await updateDoc(clientRef, {
            ...clientData,
            franchiseId, // ensure franchiseId is present
        });
        toast({
          title: "Cliente Atualizado!",
          description: `Os dados de ${clientData.name} foram atualizados.`,
        });
      } else {
        // Create new client
        const clientsRef = collection(firestore, 'franchises', franchiseId, 'clients');
        const newClientRef = doc(clientsRef); // Create a new doc with a generated ID
  
        const dataToSave: Client = {
          id: newClientRef.id,
          ...clientData,
          franchiseId: franchiseId,
        };
  
        await setDoc(newClientRef, dataToSave);
        toast({
          title: "Cliente Criado!",
          description: `O cliente ${clientData.name} foi adicionado com sucesso.`,
        });
      }
    } catch (error) {
      console.error("Error saving client: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar cliente",
        description: "Ocorreu um erro ao salvar os dados do cliente.",
      });
    } finally {
      setIsNewClientDialogOpen(false);
      setEditingClient(null);
    }
  };
  
  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setIsNewClientDialogOpen(true);
  }
  
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setEditingClient(null);
    }
    setIsNewClientDialogOpen(open);
  }
  
  const isLoading = isLoadingClients || isLoadingTechnicians;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Clientes</h1>
          <p className="text-muted-foreground">Adicione e gerencie os clientes da sua franquia.</p>
        </div>
        <Dialog open={isNewClientDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button>
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
              onCancel={() => handleDialogChange(false)}
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
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Spinner />
            </div>
          ) : (
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
                {clientList && clientList.length > 0 ? clientList.map((client) => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
