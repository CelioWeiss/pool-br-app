"use client";

import { useAuth } from '@/hooks/use-auth';
import { franchises } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function FranchisesPage() {
  const { hasRole } = useAuth();
  const router = useRouter();

  if (!hasRole('master')) {
    // Or a redirect, or an "Access Denied" component
    return <p>Acesso negado.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Franquias</h1>
          <p className="text-muted-foreground">Crie e gerencie as franquias da Pool BR.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Franquia
        </Button>
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
              {franchises.map((franchise) => (
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
