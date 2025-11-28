
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import type { Franchise } from '@/lib/types';
import { Info, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { revalidatePath } from 'next/cache';

export default function ProfilePage() {
  const { userInfo } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const franchiseId = userInfo?.franchiseId;

  const franchiseDocRef = useMemoFirebase(() =>
    firestore && franchiseId ? doc(firestore, 'franchises', franchiseId) : null
  , [firestore, franchiseId]);

  const { data: franchise, isLoading, error } = useDoc<Franchise>(franchiseDocRef);
  
  const [pixKey, setPixKey] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (franchise) {
        setPixKey(franchise.pixKey || '');
        setLogoUrl(franchise.logoUrl || '');
    }
  }, [franchise]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!franchiseDocRef) {
        toast({
            variant: 'destructive',
            title: "Erro",
            description: "Referência da franquia não encontrada.",
        });
        return;
    }
    setIsSaving(true);
    try {
        await updateDoc(franchiseDocRef, {
            pixKey: pixKey,
            logoUrl: logoUrl,
        });
        toast({
            title: "Perfil Atualizado!",
            description: "As informações da sua franquia foram salvas.",
        });
    } catch (err: any) {
        toast({
            variant: 'destructive',
            title: "Erro ao Salvar",
            description: err.message || "Não foi possível atualizar o perfil da franquia.",
        });
    } finally {
        setIsSaving(false);
    }
  }


  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Spinner size="large" /></div>;
  }

  if (!franchise && !isLoading) {
    return <p>Franquia não encontrada.</p>;
  }
  
  if (error) {
      return <p>Ocorreu um erro ao carregar os dados do perfil.</p>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Perfil da Franquia</h1>
        <p className="text-muted-foreground">Gerencie as informações da sua franquia.</p>
      </div>
      
      <form onSubmit={handleSubmit}>
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
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="E-mail, CPF/CNPJ, ou chave aleatória"
                disabled={isSaving}
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
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://exemplo.com/sua-logo.png"
                disabled={isSaving}
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
             <Button type="submit" disabled={isSaving}>
                {isSaving ? <><Spinner size="small" className="mr-2" /> Salvando...</> : "Salvar Alterações"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
