
"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import type { Franchise, UserInfo } from '@/lib/types';
import { Info, UploadCloud, X, User } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function ProfilePage() {
  const { userInfo, user, hasRole } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Franchise Data
  const franchiseId = userInfo?.franchiseId;
  const isOwner = hasRole('owner');

  const franchiseDocRef = useMemo(() =>
    firestore && franchiseId && isOwner ? doc(firestore, 'franchises', franchiseId) : null
  , [firestore, franchiseId, isOwner]);
  const { data: franchise, isLoading: isLoadingFranchise } = useDoc<Franchise>(franchiseDocRef);
  
  // User Data
  const userDocRef = useMemo(() =>
      firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userData, isLoading: isLoadingUser } = useDoc<UserInfo>(userDocRef);


  // --- Local State ---
  const [pixKey, setPixKey] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userName, setUserName] = useState('');


  useEffect(() => {
    if (franchise) {
        setPixKey(franchise.pixKey || '');
        setLogoUrl(franchise.logoUrl || '');
    }
  }, [franchise]);

  useEffect(() => {
    if (userData) {
        setUserName(`${userData.firstName} ${userData.lastName}`);
        setAvatarUrl(userData.avatarUrl || '');
    }
  }, [userData]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
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
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !userDocRef) {
        toast({
            variant: 'destructive',
            title: "Erro de Referência",
            description: "Não foi possível encontrar a referência do usuário.",
        });
        return;
    }
    setIsSaving(true);
    
    try {
        const batch = writeBatch(firestore);

        // Update Franchise Doc if it exists (only for owners)
        if (franchiseDocRef) {
          batch.update(franchiseDocRef, {
              pixKey: pixKey,
              logoUrl: logoUrl,
          });
        }

        // Update User Doc
        const [firstName, ...lastNameParts] = userName.split(' ');
        batch.update(userDocRef, {
            firstName: firstName,
            lastName: lastNameParts.join(' ') || '',
            avatarUrl: avatarUrl
        });

        await batch.commit();
        
        toast({
            title: "Perfis Atualizados!",
            description: "As informações foram salvas com sucesso.",
        });
    } catch (err: any) {
        toast({
            variant: 'destructive',
            title: "Erro ao Salvar",
            description: err.message || "Não foi possível atualizar as informações.",
        });
    } finally {
        setIsSaving(false);
    }
  }


  const isLoading = isLoadingFranchise || isLoadingUser;

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Spinner size="large" /></div>;
  }

  if (!userData && !isLoading) {
    return <p>Dados do perfil não encontrados.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciador de Perfis</h1>
        <p className="text-muted-foreground">Gerencie as informações da sua franquia e do seu perfil de usuário.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
         <Card>
            <CardHeader>
              <CardTitle>Meu Perfil</CardTitle>
              <CardDescription>
                Atualize seu nome de exibição e sua foto de perfil.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="userName">Nome Completo</Label>
                <Input
                  id="userName"
                  name="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Seu nome completo"
                  disabled={isSaving}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="avatarUrl">Sua Foto de Perfil</Label>
                <div className="flex items-center gap-4">
                   <Avatar className="h-16 w-16">
                    <AvatarImage src={avatarUrl} alt={userName} />
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                  <Input
                      id="avatarUrlInput"
                      ref={avatarFileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={(e) => handleFileChange(e, setAvatarUrl)}
                  />
                  <Button type="button" variant="outline" onClick={() => avatarFileInputRef.current?.click()} className="w-fit">
                      <UploadCloud className="mr-2" />
                      Alterar Foto
                  </Button>
                  {avatarUrl && (
                     <Button type="button" size="sm" variant="ghost" onClick={() => setAvatarUrl('')}>
                        <X size={14} className="mr-1"/>
                        Remover
                    </Button>
                  )}
                </div>
                 <p className="text-xs text-muted-foreground">Envie uma imagem de até 1MB.</p>
              </div>
            </CardContent>
          </Card>

        {isOwner && franchise && (
            <Card>
              <CardHeader>
                <CardTitle>Perfil da Franquia</CardTitle>
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
                      ref={logoFileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={(e) => handleFileChange(e, setLogoUrl)}
                  />
                  <div className="flex items-center gap-4">
                    {logoUrl ? (
                        <div className="relative w-48 h-24 bg-muted/50 p-2 rounded-md flex items-center justify-center">
                            <Image src={logoUrl} alt="Logo preview" layout="fill" className="rounded-md object-contain border p-2" />
                        </div>
                    ) : (
                        <div className="w-48 h-24 bg-muted/50 rounded-md flex items-center justify-center text-sm text-muted-foreground">
                            Sem logo
                        </div>
                    )}
                     <Button type="button" variant="outline" onClick={() => logoFileInputRef.current?.click()} className="w-fit">
                        <UploadCloud className="mr-2" />
                        {logoUrl ? "Alterar Imagem" : "Selecionar Imagem"}
                      </Button>
                      {logoUrl && (
                         <Button type="button" size="sm" variant="ghost" onClick={() => setLogoUrl('')}>
                            <X size={14} className="mr-1"/>
                            Remover
                        </Button>
                      )}
                  </div>
                   <p className="text-xs text-muted-foreground">Envie uma imagem de até 1MB.</p>
                </div>
              </CardContent>
            </Card>
        )}
        
        <div className="flex justify-end">
           <Button type="submit" disabled={isSaving} size="lg">
              {isSaving ? <><Spinner size="small" className="mr-2" /> Salvando...</> : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
