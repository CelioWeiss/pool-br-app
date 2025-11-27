
"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import type { Quote, Client } from '@/lib/types';
import { NewQuoteForm, type NewQuoteFormData } from '@/components/dashboard/quotes/new-quote-form';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function QuotesPage() {
  const { userInfo, hasRole } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();

  const franchiseId = userInfo?.franchiseId;

  const quotesCollection = useMemoFirebase(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'quotes') : null
  , [firestore, franchiseId]);
  
  const clientsCollection = useMemoFirebase(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'clients') : null
  , [firestore, franchiseId]);

  const { data: quoteList, isLoading: isLoadingQuotes } = useCollection<Quote>(quotesCollection);
  const { data: clientList, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);

  const [isNewQuoteDialogOpen, setIsNewQuoteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!hasRole(['master', 'owner']) || !franchiseId) {
    return <p>Acesso negado.</p>;
  }

  const handleSaveQuote = (data: NewQuoteFormData) => {
    if (!firestore || !franchiseId) return;

    setIsSaving(true);
    
    const newQuoteData: Omit<Quote, 'id'> = {
        franchiseId,
        clientId: data.clientId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        items: data.items,
        totalValue: data.items.reduce((acc, item) => acc + item.price, 0),
        notes: data.notes,
        status: 'pending',
        createdAt: new Date().toISOString(),
    };

    const quotesRef = collection(firestore, 'franchises', franchiseId, 'quotes');
    
    addDoc(quotesRef, newQuoteData)
    .then(() => {
        toast({
            title: "Orçamento Criado!",
            description: `O orçamento para ${data.clientName} foi salvo com sucesso.`,
        });
        setIsNewQuoteDialogOpen(false);
    })
    .catch((error) => {
        console.error("Error creating quote: ", error);
        
        const permissionError = new FirestorePermissionError({
            path: quotesRef.path,
            operation: 'create',
            requestResourceData: newQuoteData,
        });
        errorEmitter.emit('permission-error', permissionError);
    })
    .finally(() => {
        setIsSaving(false);
    });
  };

  const isLoading = isLoadingClients || isLoadingQuotes;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Orçamentos</h1>
          <p className="text-muted-foreground">Crie e gerencie orçamentos para clientes novos e existentes.</p>
        </div>
        <Dialog open={isNewQuoteDialogOpen} onOpenChange={setIsNewQuoteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Orçamento</DialogTitle>
              <DialogDescription>
                Preencha os dados abaixo para gerar um novo orçamento.
              </DialogDescription>
            </DialogHeader>
            <NewQuoteForm
              clients={clientList || []}
              onSave={handleSaveQuote}
              onCancel={() => setIsNewQuoteDialogOpen(false)}
              isSaving={isSaving}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orçamentos</CardTitle>
          <CardDescription>Lista de orçamentos criados.</CardDescription>
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quoteList && quoteList.length > 0 ? quoteList.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.clientName}</TableCell>
                    <TableCell>{format(new Date(quote.createdAt), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell>
                      <Badge variant={quote.status === 'pending' ? 'secondary' : quote.status === 'accepted' ? 'default' : 'destructive'}>
                        {quote.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        {quote.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" disabled>Ver</Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Nenhum orçamento encontrado.</TableCell>
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
