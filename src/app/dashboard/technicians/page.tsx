"use client";

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Technician } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';

export default function TechniciansPage() {
  const { userInfo, hasRole } = useAuth();
  const firestore = useFirestore();

  const franchiseId = userInfo?.franchiseId;

  const techniciansCollection = useMemoFirebase(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'technicians') : null
  , [firestore, franchiseId]);

  const { data: franchiseTechnicians, isLoading } = useCollection<Technician>(techniciansCollection);
  
  if (!hasRole('owner')) {
    return <p>Acesso negado.</p>;
  }

  const getAvatarUrl = (id: string) => {
    // This logic can be improved to map specific avatars to technicians
    const placeholder = PlaceHolderImages.find(p => p.id.startsWith('avatar'));
    return placeholder?.imageUrl;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Técnicos</h1>
          <p className="text-muted-foreground">Adicione e gerencie os técnicos da sua equipe.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Técnico
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>Lista de técnicos da sua franquia.</CardDescription>
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
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {franchiseTechnicians && franchiseTechnicians.length > 0 ? franchiseTechnicians.map((technician) => (
                  <TableRow key={technician.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={getAvatarUrl(technician.id)} alt={technician.firstName} />
                          <AvatarFallback>{technician.firstName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {technician.firstName} {technician.lastName}
                      </div>
                    </TableCell>
                    <TableCell>{technician.phone}</TableCell>
                     <TableCell>{technician.email}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Editar</Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Nenhum técnico encontrado.</TableCell>
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
