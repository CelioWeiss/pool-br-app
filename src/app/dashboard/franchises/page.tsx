"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { NewFranchiseData, Franchise } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewFranchiseForm } from '@/components/dashboard/franchises/new-franchise-form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function FranchisesPage() {
  const { hasRole } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isNewFranchiseDialogOpen, setIsNewFranchiseDialogOpen] = useState(false);

  const franchisesQuery = useMemoFirebase(() => collection(firestore, 'franchises'), [firestore]);
  const { data: franchiseList, isLoading } = useCollection<Franchise>(franchisesQuery);

  if (!hasRole('master')) {
    return <p>Acesso negado.</p>;
  }

  const handleSaveFranchise = (data: NewFranchiseData) => {
    const franchisesCol = collection(firestore, 'franchises');
    addDocumentNonBlocking(franchisesCol, data);
    
    toast({
      title: "Franquia Criada!",
      description: `A franquia ${data.name} foi adicionada com sucesso.`,
    });
    setIsNewFranchiseDialogOpen(false);
  };

  return (
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Franquia</TableHead>
                <TableHead>Região</TableHead>
                <TableHead>Proprietário (ID)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Carregando franquias...</TableCell>
                  </TableRow>
              )}
              {!isLoading && franchiseList && franchiseList.map((franchise) => (
                <TableRow key={franchise.id}>
                  <TableCell className="font-medium">{franchise.name}</TableCell>
                  <TableCell>{franchise.region}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{franchise.ownerId}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Editar</Button>
                  </TableCell>
                </TableRow>
              ))}
               {!isLoading && (!franchiseList || franchiseList.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Nenhuma franquia encontrada.</TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
