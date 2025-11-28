
"use client";

import React, { useEffect, useState, useRef } from 'react';
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
import { Info, UploadCloud, X } from 'lucide-react';
import Image from 'next/image';

export default function ProfilePage() {
  const { userInfo } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "Por favor, selecione uma imagem com menos de 1MB."
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
              <Label htmlFor="logoUrl">Logo da Franquia</Label>
              <Input
                  id="logoUrlInput"
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
              />
              {logoUrl ? (
                  <div className="relative w-48 h-24">
                      <Image src={logoUrl} alt="Logo preview" layout="fill" className="rounded-md object-contain border p-2" />
                      <Button type="button" size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => setLogoUrl('')}>
                          <X size={14}/>
                      </Button>
                  </div>
              ) : (
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-fit">
                    <UploadCloud className="mr-2" />
                    Selecionar Imagem
                  </Button>
              )}
               <p className="text-xs text-muted-foreground">Envie uma imagem de até 1MB.</p>
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
