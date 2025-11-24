"use client";

import { useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Technician } from '@/lib/types';


export default function TechniciansPage() {
  const { userInfo, hasRole } = useAuth();
  const firestore = useFirestore();
  
  if (!hasRole('owner')) {
    return <p>Acesso negado.</p>;
  }

  const techniciansQuery = useMemoFirebase(() => {
    if (!userInfo?.franchiseId) return null;
    return collection(firestore, 'franchises', userInfo.franchiseId, 'technicians');
  }, [firestore, userInfo?.franchiseId]);
  
  const { data: franchiseTechnicians, isLoading } = useCollection<Technician>(techniciansQuery);

  // A temporary mapping for avatar images, since this is not in our data model.
  const avatarMap: { [key: string]: string } = {
    'Bruno Alves': 'https://images.unsplash.com/photo-1725866546799-4cc16f6cba23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxtYW4lMjBzbWlsaW5nfGVufDB8fHx8fDE3NjM5NzI3MTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'Carlos Dias': 'https://images.unsplash.com/photo-1522556189639-b150ed9c4330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxtYW4lMjBwb3J0cmFpdHxlbnwwfHx8fDE3NjM5MjU3NzF8MA&ixlib=rb-4.1.0&q=80&w=1080',
  };


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
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Carregando técnicos...</TableCell>
                </TableRow>
              )}
              {!isLoading && franchiseTechnicians && franchiseTechnicians.map((technician) => (
                <TableRow key={technician.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={avatarMap[technician.firstName + ' ' + technician.lastName]} alt={technician.firstName} />
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
              ))}
              {!isLoading && (!franchiseTechnicians || franchiseTechnicians.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Nenhum técnico encontrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
