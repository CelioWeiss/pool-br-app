
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFormState } from 'react-dom';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { updateFranchiseProfileAction } from '@/app/actions';
import type { Franchise } from '@/lib/types';
import { Info, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <><Spinner size="small" className="mr-2" /> Salvando...</> : "Salvar Alterações"}
    </Button>
  );
}

export default function ProfilePage() {
  const { userInfo } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const franchiseId = userInfo?.franchiseId;

  const franchiseDocRef = useMemoFirebase(() =>
    firestore && franchiseId ? doc(firestore, 'franchises', franchiseId) : null
  , [firestore, franchiseId]);

  const { data: franchise, isLoading } = useDoc<Franchise>(franchiseDocRef);

  const initialState = { success: false, error: undefined };
  const [state, formAction] = useFormState(updateFranchiseProfileAction, initialState);
  
  useEffect(() => {
    if (state.success) {
      toast({
        title: "Perfil Atualizado!",
        description: "As informações da sua franquia foram salvas.",
      });
    }
    if (state.error) {
      toast({
        variant: 'destructive',
        title: "Erro ao Salvar",
        description: state.error,
      });
    }
  }, [state, toast]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Spinner size="large" /></div>;
  }

  if (!franchise) {
    return <p>Franquia não encontrada.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Perfil da Franquia</h1>
        <p className="text-muted-foreground">Gerencie as informações da sua franquia.</p>
      </div>
      
      <form action={formAction}>
        <input type="hidden" name="franchiseId" value={franchise.id} />
        <Card>
          <CardHeader>
            <CardTitle>Informações de Pagamento e Marca</CardTitle>
            <CardDescription>
              Adicione a chave PIX para receber pagamentos e a logo da sua franquia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pixKey">Chave PIX</Label>
              <Input
                id="pixKey"
                name="pixKey"
                defaultValue={franchise.pixKey}
                placeholder="E-mail, CPF/CNPJ, ou chave aleatória"
              />
              <p className="text-sm text-muted-foreground flex items-center gap-2 pt-1">
                <Info size={14} /> Esta chave PIX será exibida no portal do cliente para pagamentos.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">URL da Logo da Franquia</Label>
              <Input
                id="logoUrl"
                name="logoUrl"
                defaultValue={franchise.logoUrl}
                placeholder="https://exemplo.com/sua-logo.png"
              />
               <Alert variant="default" className="mt-2 bg-blue-50 border-blue-200 text-blue-800">
                <AlertCircle className="h-4 w-4 !text-blue-800" />
                <AlertTitle>Upload de Imagem</AlertTitle>
                <AlertDescription>
                  A funcionalidade de upload direto de imagens ainda não está disponível. Por favor, cole a URL de uma imagem já hospedada na internet.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
          <div className="p-6 pt-0">
             <SubmitButton />
          </div>
        </Card>
      </form>
    </div>
  );
}

    