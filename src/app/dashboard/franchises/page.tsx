
"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Franchise, UserInfo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { NewFranchiseForm } from '@/components/dashboard/franchises/new-franchise-form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { useCollection } from '@/firebase';
import { Spinner } from '@/components/ui/spinner';
import type { NewFranchiseFormData } from '@/components/dashboard/franchises/new-franchise-form';

export default function FranchisesPage() {
  const { hasRole, auth } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();
  

  const franchisesCollection = useMemo(() => 
    firestore ? collection(firestore, 'franchises') : null
  , [firestore]);

  const { data: franchiseList, isLoading } = useCollection<Franchise>(franchisesCollection);

  const [isNewFranchiseDialogOpen, setIsNewFranchiseDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [franchiseToDelete, setFranchiseToDelete] = useState<Franchise | null>(null);

  if (!hasRole('master')) {
    return <p>Acesso negado.</p>;
  }

  const handleSaveFranchise = async (data: NewFranchiseFormData) => {
    if (!firestore || !auth) return;
    
    setIsSaving(true);
    
    try {
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.ownerEmail, data.password);
      const ownerUid = userCredential.user.uid;

      // 2. Prepare Firestore batch write for atomicity
      const batch = writeBatch(firestore);

      // 3. Define Franchise document reference and data
      const franchiseRef = doc(collection(firestore, 'franchises'));
      const newFranchise: Omit<Franchise, 'logoUrl' | 'pixKey' | 'details' | 'configuration'> = {
        id: franchiseRef.id,
        name: data.franchiseName,
        address: `${data.city}, ${data.state}`,
        ownerId: ownerUid,
        contactEmail: data.ownerEmail,
        contactPhone: data.ownerPhone,
        createdAt: new Date().toISOString(),
      };
      batch.set(franchiseRef, newFranchise);

      // 4. Define User Profile document reference and data IN THE ROOT /users collection
      const userProfileRef = doc(firestore, 'users', ownerUid);
      const [ownerFirstName, ...ownerLastNameParts] = data.ownerName.split(' ');
      const newUserProfile: UserInfo = {
        id: ownerUid,
        firstName: ownerFirstName,
        lastName: ownerLastNameParts.join(' ') || '',
        email: data.ownerEmail,
        role: 'owner',
        franchiseId: franchiseRef.id, // CRITICAL: Assign the new franchise ID here
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      batch.set(userProfileRef, newUserProfile);
      
      // 5. Commit the atomic batch write
      await batch.commit();

      toast({
        title: "Franquia e Proprietário Criados!",
        description: `A franquia ${data.franchiseName} foi adicionada com sucesso.`,
      });
      setIsNewFranchiseDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating franchise and user: ", error);
      let description = "Ocorreu um erro ao salvar a nova franquia.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este e-mail já está em uso por outro usuário.";
      } else if (error.code === 'auth/weak-password') {
        description = "A senha é muito fraca. Use pelo menos 6 caracteres.";
      }
      
      toast({
        variant: 'destructive',
        title: "Erro ao criar franquia",
        description: description,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFranchise = async () => {
    if (!franchiseToDelete || !firestore) return;
    try {
      // Note: This only deletes the franchise document.
      // A complete solution would involve a Cloud Function to delete all associated data (users, clients, etc.)
      await deleteDoc(doc(firestore, 'franchises', franchiseToDelete.id));
      toast({
        title: "Franquia Excluída!",
        description: `A franquia ${franchiseToDelete.name} foi removida.`,
      });
    } catch(error) {
       console.error("Error deleting franchise: ", error);
       toast({
        variant: 'destructive',
        title: "Erro ao excluir franquia",
        description: "Ocorreu um erro ao tentar excluir a franquia.",
      });
    } finally {
      setFranchiseToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Franquias</h1>
            <p className="text-muted-foreground">Crie e gerencie as franquias da Pool BR.</p>
          </div>
          <Dialog open={isNewFranchiseDialogOpen} onOpenChange={setIsNewFranchiseDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Franquia
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Adicionar Nova Franquia</DialogTitle>
                <DialogDescription>
                  Preencha os dados para cadastrar uma nova franquia e o perfil de seu proprietário.
                </DialogDescription>
              </DialogHeader>
              <NewFranchiseForm 
                onSave={handleSaveFranchise} 
                onCancel={() => setIsNewFranchiseDialogOpen(false)}
                isSaving={isSaving}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Franquias Ativas</CardTitle>
            <CardDescription>Lista de todas as franquias registradas no sistema.</CardDescription>
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
                    <TableHead>Nome da Franquia</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Proprietário (ID)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {franchiseList && franchiseList.length > 0 ? franchiseList.map((franchise) => (
                    <TableRow key={franchise.id}>
                      <TableCell className="font-medium">{franchise.name}</TableCell>
                      <TableCell>{franchise.address}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{franchise.ownerId}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" disabled>Editar</Button>
                        <Button variant="destructive" size="sm" onClick={() => setFranchiseToDelete(franchise)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Nenhuma franquia encontrada.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      
      <AlertDialog open={!!franchiseToDelete} onOpenChange={(open) => !open && setFranchiseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a franquia
              <span className="font-bold"> {franchiseToDelete?.name}</span>. A conta do proprietário não será removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFranchiseToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFranchise}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
