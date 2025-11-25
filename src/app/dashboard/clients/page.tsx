
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewClientForm, type NewClientFormData } from '@/components/dashboard/clients/new-client-form';
import type { Client, Technician, UserInfo } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useAuth as useFirebaseAuth, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Spinner } from '@/components/ui/spinner';


export default function ClientsPage() {
  const { userInfo } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useFirebaseAuth();

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
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = userInfo?.role === 'owner';

  if (!isOwner || !franchiseId) {
    return <p>Acesso negado.</p>;
  }

  const getTechnicianName = (id: string | null) => {
    if (!id || !franchiseTechnicians) return 'N/A';
    const technician = franchiseTechnicians.find(t => t.id === id);
    return technician ? `${technician.firstName} ${technician.lastName}` : 'N/A';
  }

  const handleSaveClient = async (clientData: NewClientFormData) => {
    if (!firestore || !auth || !franchiseId) return;
  
    setIsSaving(true);
  
    try {
      const batch = writeBatch(firestore);
      let newUserId: string | null = null;
  
      // This is a partial type because some fields might be undefined from the form
      const dataToSave: Partial<Client> = {
          name: clientData.name,
          address: clientData.address,
          contactName: clientData.contactName,
          contactPhone: clientData.contactPhone,
          contactEmail: clientData.contactEmail,
          poolDetails: clientData.poolDetails,
          technicianId: clientData.technicianId,
          monthlyFee: clientData.monthlyFee,
          dueDay: clientData.dueDay,
          contractType: clientData.contractType,
          serviceDays: clientData.serviceDays,
      };

      if (editingClient) {
        const clientRef = doc(firestore, 'franchises', franchiseId, 'clients', editingClient.id);
        batch.update(clientRef, dataToSave);

      } else {
        if (!clientData.password) {
            throw new Error("A senha é obrigatória para novos clientes.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, clientData.contactEmail, clientData.password);
        newUserId = userCredential.user.uid;

        const clientRef = doc(collection(firestore, 'franchises', franchiseId, 'clients'));
        const newClient: Client = {
          id: clientRef.id,
          userId: newUserId,
          franchiseId: franchiseId,
          createdAt: new Date().toISOString(),
          ...dataToSave, // Spread the rest of the data
        } as Client; // Cast to Client to ensure all fields are there
        batch.set(clientRef, newClient);
        
        const userRef = doc(firestore, 'users', newUserId);
        const [firstName, ...lastNameParts] = clientData.name.split(' ');
        const newUserProfile: UserInfo = {
            id: newUserId,
            franchiseId: franchiseId,
            role: 'client',
            firstName: firstName,
            lastName: lastNameParts.join(' ') || '',
            email: clientData.contactEmail,
            isActive: true,
            createdAt: new Date().toISOString(),
        };
        batch.set(userRef, newUserProfile);
      }

      batch.commit().then(() => {
        toast({
          title: editingClient ? "Cliente Atualizado!" : "Cliente Criado!",
          description: `Os dados de ${clientData.name} foram salvos com sucesso.`,
        });
        setIsNewClientDialogOpen(false);
        setEditingClient(null);
      }).catch((error: any) => {
        const permissionError = new FirestorePermissionError({
            path: `/franchises/${franchiseId}/clients`,
            operation: editingClient ? 'update' : 'create',
            requestResourceData: clientData,
        });
        errorEmitter.emit('permission-error', permissionError);
      }).finally(() => {
        setIsSaving(false);
      });
  
    } catch (error: any) {
        let description = "Ocorreu um erro ao salvar os dados do cliente.";
        if (error.code === 'auth/email-already-in-use') {
            description = "O e-mail fornecido já está em uso por outra conta.";
        } else if (error.code === 'auth/weak-password') {
            description = "A senha é muito fraca. Por favor, use pelo menos 6 caracteres.";
        }
        toast({
            variant: "destructive",
            title: "Erro ao Salvar",
            description: description,
        });
        setIsSaving(false);
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
                {editingClient ? 'Atualize os dados do cliente.' : 'Preencha os dados e crie o acesso do cliente ao portal.'}
              </DialogDescription>
            </DialogHeader>
            <NewClientForm 
              client={editingClient}
              technicians={franchiseTechnicians || []} 
              onSave={handleSaveClient}
              onCancel={() => handleDialogChange(false)}
              isSaving={isSaving}
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
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/clients/${client.id}`} className="hover:underline text-primary">
                        {client.name}
                      </Link>
                    </TableCell>
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
