"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { NewFranchiseData, Franchise } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { NewFranchiseForm } from '@/components/dashboard/franchises/new-franchise-form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';

export default function FranchisesPage() {
  const { userInfo, hasRole } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();

  const franchisesCollection = useMemoFirebase(() => 
    firestore ? collection(firestore, 'franchises') : null
  , [firestore]);

  const { data: franchiseList, isLoading } = useCollection<Franchise>(franchisesCollection);

  const [isNewFranchiseDialogOpen, setIsNewFranchiseDialogOpen] = useState(false);
  const [franchiseToDelete, setFranchiseToDelete] = useState<Franchise | null>(null);

  if (!hasRole('master')) {
    return <p>Acesso negado.</p>;
  }

  const handleSaveFranchise = async (data: NewFranchiseData) => {
    if (!firestore) return;
    try {
      await addDoc(collection(firestore, 'franchises'), data);
      toast({
        title: "Franquia Criada!",
        description: `A franquia ${data.name} foi adicionada com sucesso.`,
      });
      setIsNewFranchiseDialogOpen(false);
    } catch (error) {
      console.error("Error creating franchise: ", error);
      toast({
        variant: 'destructive',
        title: "Erro ao criar franquia",
        description: "Ocorreu um erro ao salvar a nova franquia.",
      });
    }
  };

  const handleDeleteFranchise = async () => {
    if (!franchiseToDelete || !firestore) return;
    try {
      await deleteDoc(doc(firestore, 'franchises', franchiseToDelete.id));
      toast({
        title: "Franquia Excluída!",
        description: `A franquia ${franchiseToDelete.name} foi removida.`,
        variant: 'destructive',
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
                  Preencha os dados abaixo para cadastrar uma nova franquia.
                </DialogDescription>
              </DialogHeader>
              <NewFranchiseForm onSave={handleSaveFranchise} onCancel={() => setIsNewFranchiseDialogOpen(false)} />
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
                        {/* <Button variant="ghost" size="sm">Editar</Button> */}
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
              <span className="font-bold"> {franchiseToDelete?.name}</span> e todos os seus dados associados.
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
