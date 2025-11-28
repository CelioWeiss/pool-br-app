
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Edit, UserX } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NewClientForm, type NewClientFormData } from '@/components/dashboard/clients/new-client-form';
import type { Client, Technician, UserInfo } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ClientsPage() {
  const { userInfo } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = getAuth(); // Use getAuth() to get the auth instance

  const franchiseId = userInfo?.franchiseId;

  const clientsQuery = useMemoFirebase(() => 
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'clients') : null
  , [firestore, franchiseId]);
  
  const { data: clientList, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [clientToDeactivate, setClientToDeactivate] = useState<Client | null>(null);


  const isOwner = userInfo?.role === 'owner';

  if (!isOwner || !franchiseId) {
    return <p>Acesso negado.</p>;
  }

  const handleSaveClient = async (clientData: NewClientFormData, clientId?: string) => {
    if (!firestore || !auth || !franchiseId) return;
  
    setIsSaving(true);
    
    const isEditing = !!clientId;
  
    try {
      const batch = writeBatch(firestore);
  
      const dataToSave: Partial<Pick<Client, 'name' | 'contactName' | 'contactPhone' | 'contactEmail' | 'avatarUrl' | 'monthlyFee' | 'dueDay'>> = {
          name: clientData.name,
          contactName: clientData.contactName,
          contactPhone: clientData.contactPhone,
          contactEmail: clientData.contactEmail,
          avatarUrl: clientData.avatarUrl,
          monthlyFee: clientData.monthlyFee,
          dueDay: clientData.dueDay,
      };

      if (isEditing) {
        const clientRef = doc(firestore, 'franchises', franchiseId, 'clients', clientId);
        let finalData: Partial<Client> = { ...dataToSave };

        if (!editingClient?.userId && clientData.password) {
           const userCredential = await createUserWithEmailAndPassword(auth, clientData.contactEmail, clientData.password);
           const newUserId = userCredential.user.uid;
           finalData.userId = newUserId;
           
           const userRef = doc(firestore, 'users', newUserId);
           const [firstName, ...lastNameParts] = clientData.name.split(' ');
           const newUserProfile: Omit<UserInfo, 'avatarUrl' | 'phone'> = {
               id: newUserId,
               franchiseId: franchiseId,
               role: 'client',
               firstName: firstName,
               lastName: lastNameParts.join(' ') || '',
               email: clientData.contactEmail,
               isActive: true,
           };
           batch.set(userRef, newUserProfile);
        }

        batch.update(clientRef, finalData);

      } else { // Creating a new client
        if (!clientData.password) {
            throw new Error("A senha é obrigatória para novos clientes.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, clientData.contactEmail, clientData.password);
        const newUserId = userCredential.user.uid;

        const clientRef = doc(collection(firestore, 'franchises', franchiseId, 'clients'));
        const newClient: Client = {
          id: clientRef.id,
          userId: newUserId,
          franchiseId: franchiseId,
          createdAt: new Date().toISOString(),
          isActive: true,
          ...dataToSave,
        } as Client;
        batch.set(clientRef, newClient);
        
        const userRef = doc(firestore, 'users', newUserId);
        const [firstName, ...lastNameParts] = clientData.name.split(' ');
        const newUserProfile: Omit<UserInfo, 'avatarUrl' | 'phone'> = {
            id: newUserId,
            franchiseId: franchiseId,
            role: 'client',
            firstName: firstName,
            lastName: lastNameParts.join(' ') || '',
            email: clientData.contactEmail,
            isActive: true,
        };
        batch.set(userRef, newUserProfile);
      }

      await batch.commit();

      toast({
        title: isEditing ? "Cliente Atualizado!" : "Cliente Criado!",
        description: `Os dados de ${clientData.name} foram salvos com sucesso.`,
      });
      setIsNewClientDialogOpen(false);
      setEditingClient(null);
  
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
    } finally {
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

  const handleDeactivateClient = async () => {
    if (!clientToDeactivate || !firestore || !franchiseId) return;

    const clientRef = doc(firestore, 'franchises', franchiseId, 'clients', clientToDeactivate.id);
    try {
        await updateDoc(clientRef, { isActive: false });
        
        // Optionally deactivate the user profile as well
        if (clientToDeactivate.userId) {
            const userRef = doc(firestore, 'users', clientToDeactivate.userId);
            await updateDoc(userRef, { isActive: false });
        }

        toast({
            title: "Cliente Inativado!",
            description: `${clientToDeactivate.name} foi marcado como inativo.`,
        });
    } catch (error) {
        console.error("Error deactivating client: ", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível inativar o cliente." });
    } finally {
        setClientToDeactivate(null);
    }
  };
  
  const activeClients = useMemo(() => clientList?.filter(c => c.isActive !== false) || [], [clientList]);

  return (
    <>
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
                onSave={handleSaveClient}
                onCancel={() => handleDialogChange(false)}
                isSaving={isSaving}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Clientes Ativos</CardTitle>
                <CardDescription>Lista de clientes ativos da sua franquia.</CardDescription>
              </div>
              {!isLoadingClients && activeClients && (
                <Badge variant="secondary">{activeClients.length} cliente(s)</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingClients ? (
              <div className="flex justify-center items-center h-48">
                <Spinner />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeClients && activeClients.length > 0 ? activeClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/clients/${client.id}`} className="hover:underline text-primary">
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell>{client.contactName}</TableCell>
                      <TableCell>{client.contactEmail}</TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleEditClick(client)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setClientToDeactivate(client)} className="text-destructive">
                                     <UserX className="mr-2 h-4 w-4" />
                                    Inativar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center">Nenhum cliente encontrado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

       <AlertDialog open={!!clientToDeactivate} onOpenChange={(open) => !open && setClientToDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar Cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marcará o cliente <span className="font-bold">{clientToDeactivate?.name}</span> como inativo. Ele não aparecerá mais nas listas principais, mas seus dados serão mantidos. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDeactivate(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivateClient} className={buttonVariants({ variant: "destructive" })}>Inativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
