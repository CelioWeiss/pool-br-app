
"use client";

import React, { useMemo, use } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Quote, Franchise } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
    pending: { label: 'Pendente', variant: 'secondary' as const },
    accepted: { label: 'Aprovado', variant: 'default' as const, className: 'bg-green-600' },
    rejected: { label: 'Negado', variant: 'destructive' as const },
};

export default function QuoteDetailsPage() {
    const params = useParams();
    const { userInfo } = useAuth();
    const firestore = useFirestore();

    const quoteId = Array.isArray(params.quoteId) ? params.quoteId[0] : params.quoteId;
    const franchiseId = userInfo?.franchiseId;

    const quoteDocRef = useMemo(() => 
        firestore && franchiseId && quoteId ? doc(firestore, 'franchises', franchiseId, 'quotes', quoteId) : null
    , [firestore, franchiseId, quoteId]);
    const { data: quote, isLoading: isLoadingQuote } = useDoc<Quote>(quoteDocRef);
    
    const franchiseDocRef = useMemo(() =>
        firestore && franchiseId ? doc(firestore, 'franchises', franchiseId) : null
    , [firestore, franchiseId]);
    const { data: franchise, isLoading: isLoadingFranchise } = useDoc<Franchise>(franchiseDocRef);

    const isLoading = isLoadingQuote || isLoadingFranchise;

    if (isLoading) {
        return (
          <div className="flex h-[80vh] items-center justify-center">
            <Spinner size="large" />
          </div>
        );
    }
    
    if (!quote) {
        return (
          <div className="text-center py-10">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="mt-4 text-2xl font-bold">Orçamento não encontrado</h2>
            <p className="mt-2 text-muted-foreground">Não foi possível carregar os dados deste orçamento.</p>
          </div>
        );
    }

    const currentStatus = statusConfig[quote.status] || statusConfig.pending;
    
    return (
        <>
            <div className="flex items-center justify-between mb-8 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Detalhes do Orçamento</h1>
                    <p className="text-muted-foreground">Orçamento para {quote.clientName}</p>
                </div>
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir Orçamento
                </Button>
            </div>

            <Card id="printable-quote" className="w-full max-w-4xl mx-auto shadow-lg print:shadow-none print:border-none">
                <CardHeader className="bg-muted/30">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div>
                            {franchise?.logoUrl ? (
                                <Image src={franchise.logoUrl} alt="Logo da Franquia" width={150} height={75} className="object-contain" />
                            ) : (
                                <h2 className="text-xl font-bold">{franchise?.name}</h2>
                            )}
                             <p className="text-sm text-muted-foreground">{franchise?.address}</p>
                             <p className="text-sm text-muted-foreground">{franchise?.contactEmail} | {franchise?.contactPhone}</p>
                        </div>
                         <div className="text-left sm:text-right">
                            <h2 className="text-2xl font-bold tracking-tight">ORÇAMENTO</h2>
                            <p className="text-sm text-muted-foreground">#{quote.id.substring(0, 7)}</p>
                            <p className="text-sm text-muted-foreground">Data: {format(new Date(quote.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</p>
                            <Badge variant={currentStatus.variant} className={`mt-2 ${currentStatus.className}`}>{currentStatus.label}</Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div>
                        <h3 className="text-base font-semibold text-muted-foreground">Orçamento Para:</h3>
                        <p className="font-bold text-lg">{quote.clientName}</p>
                        <p className="text-sm">{quote.clientEmail}</p>
                        <p className="text-sm">{quote.clientPhone}</p>
                    </div>

                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60%]">Serviço / Produto</TableHead>
                                <TableHead className="text-right">Preço</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quote.items.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.service}</TableCell>
                                    <TableCell className="text-right">{item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    
                    <div className="flex justify-end">
                        <div className="w-full max-w-sm space-y-2">
                             <div className="flex justify-between font-semibold text-lg">
                                <span>Total</span>
                                <span>{quote.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        </div>
                    </div>

                    {quote.notes && (
                         <div>
                            <h4 className="font-semibold">Observações:</h4>
                            <p className="text-xs text-muted-foreground">{quote.notes}</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="text-center text-xs text-muted-foreground p-4 bg-muted/30">
                     Obrigado por escolher a {franchise?.name || "Pool BR"}!
                </CardFooter>
            </Card>

            <style jsx global>{`
                @media print {
                    body {
                        background-color: white;
                    }
                    .print\\:hidden {
                        display: none;
                    }
                     .print\\:shadow-none {
                        box-shadow: none;
                    }
                    .print\\:border-none {
                        border: none;
                    }
                }
            `}</style>
        </>
    );
}
