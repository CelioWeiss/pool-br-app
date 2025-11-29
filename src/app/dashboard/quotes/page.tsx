
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
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

  const quotesCollection = useMemo(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'quotes') : null
  , [firestore, franchiseId]);
  
  const clientsCollection = useMemo(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'clients') : null
  , [firestore, franchiseId]);

  const { data: quoteList, isLoading: isLoadingQuotes } = useCollection<Quote>(quotesCollection);
  const { data: clientList, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);

  const [isNewQuoteDialogOpen, setIsNewQuoteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);


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
    .then((docRef) => {
        const quoteWithId = { ...newQuoteData, id: docRef.id };
        updateDoc(docRef, { id: docRef.id }); // Add id to the document
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

  const handleStatusChange = async (quoteId: string, status: Quote['status']) => {
    if (!firestore || !franchiseId) return;
    setUpdatingStatusId(quoteId);
    const quoteRef = doc(firestore, 'franchises', franchiseId, 'quotes', quoteId);
    try {
      await updateDoc(quoteRef, { status });
      toast({
        title: 'Status atualizado!',
        description: `O orçamento foi marcado como ${status}.`,
      });
    } catch (error) {
      console.error("Error updating quote status: ", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível alterar o status do orçamento.',
      });
    } finally {
        setUpdatingStatusId(null);
    }
  };

  const statusConfig = {
    pending: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
    accepted: { label: 'Aprovado', variant: 'default' as const, className: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    rejected: { label: 'Negado', variant: 'destructive' as const, icon: XCircle },
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
                {quoteList && quoteList.length > 0 ? quoteList.map((quote) => {
                  const currentStatus = statusConfig[quote.status] || statusConfig.pending;
                  const isUpdating = updatingStatusId === quote.id;
                  return (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.clientName}</TableCell>
                    <TableCell>{format(new Date(quote.createdAt), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell>
                      <Badge variant={currentStatus.variant} className={currentStatus.className}>
                        <currentStatus.icon className="mr-1 h-3 w-3" />
                        {currentStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        {quote.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className="text-right">
                      {isUpdating ? <Spinner size="small" /> : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/quotes/${quote.id}`}><Eye className="mr-2 h-4 w-4" />Ver Detalhes</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'accepted')} disabled={quote.status === 'accepted'}>
                                    <CheckCircle className="mr-2 h-4 w-4" />Marcar como Aprovado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'rejected')} disabled={quote.status === 'rejected'}>
                                    <XCircle className="mr-2 h-4 w-4" />Marcar como Negado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'pending')} disabled={quote.status === 'pending'}>
                                    <Clock className="mr-2 h-4 w-4" />Marcar como Pendente
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                }) : (
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

    