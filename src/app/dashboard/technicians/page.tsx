"use client";

import { useAuth } from '@/hooks/use-auth';
import { technicians } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function TechniciansPage() {
  const { user, hasRole } = useAuth();
  
  if (!hasRole('owner')) {
    return <p>Acesso negado.</p>;
  }

  const franchiseTechnicians = technicians.filter(t => t.franchiseId === user?.franchiseId);

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
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {franchiseTechnicians.map((technician) => (
                <TableRow key={technician.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={technician.avatarUrl} alt={technician.name} />
                        <AvatarFallback>{technician.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {technician.name}
                    </div>
                  </TableCell>
                  <TableCell>{technician.phone}</TableCell>
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
