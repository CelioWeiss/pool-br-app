
"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import type { Technician, UserInfo } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewTechnicianForm, type NewTechnicianFormData } from '@/components/dashboard/technicians/new-technician-form';
import { useToast } from '@/hooks/use-toast';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';


export default function TechniciansPage() {
  const { userInfo, hasRole } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const franchiseId = userInfo?.franchiseId;

  const techniciansCollection = useMemoFirebase(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'technicians') : null
  , [firestore, franchiseId]);

  const { data: franchiseTechnicians, isLoading } = useCollection<Technician>(techniciansCollection);

  const [isNewTechnicianDialogOpen, setIsNewTechnicianDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  if (!hasRole('owner') || !franchiseId) {
    return <p>Acesso negado.</p>;
  }

  const getAvatarUrl = (id: string) => {
    // This logic can be improved to map specific avatars to technicians
    const placeholder = PlaceHolderImages.find(p => p.id.startsWith('avatar'));
    return placeholder?.imageUrl;
  }

  const handleSaveTechnician = async (data: NewTechnicianFormData) => {
    if (!firestore || !franchiseId) return;
    setIsSaving(true);
    
    const auth = getAuth();

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const newUserId = userCredential.user.uid;

      // 2. Prepare batch write
      const batch = writeBatch(firestore);

      // 3. Create Technician document
      const technicianRef = doc(collection(firestore, 'franchises', franchiseId, 'technicians'));
      const [firstName, ...lastNameParts] = data.name.split(' ');
      
      const newTechnician: Technician = {
        id: technicianRef.id,
        userId: newUserId,
        franchiseId: franchiseId,
        firstName: firstName,
        lastName: lastNameParts.join(' ') || '',
        phone: data.phone,
        email: data.email,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      batch.set(technicianRef, newTechnician);

      // 4. Create User Profile document
      const userProfileRef = doc(firestore, 'users', newUserId);
      const newUserProfile: Omit<UserInfo, 'id'> = {
        firstName: firstName,
        lastName: lastNameParts.join(' ') || '',
        email: data.email,
        role: 'technician',
        franchiseId: franchiseId,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      batch.set(userProfileRef, newUserProfile);

      // 5. Commit batch
      await batch.commit();

      toast({
        title: "Técnico Criado!",
        description: `O técnico ${data.name} foi adicionado à equipe.`,
      });
      setIsNewTechnicianDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating technician:", error);
      let description = "Ocorreu um erro ao salvar o novo técnico.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este e-mail já está em uso por outro usuário.";
      } else if (error.code === 'auth/weak-password') {
        description = "A senha é muito fraca. Use pelo menos 6 caracteres.";
      }
      toast({
        variant: 'destructive',
        title: "Erro ao criar técnico",
        description: description,
      });
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Técnicos</h1>
          <p className="text-muted-foreground">Adicione e gerencie os técnicos da sua equipe.</p>
        </div>
        <Dialog open={isNewTechnicianDialogOpen} onOpenChange={setIsNewTechnicianDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Técnico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Técnico</DialogTitle>
              <DialogDescription>
                Preencha os dados abaixo para cadastrar um novo técnico e criar seu acesso.
              </DialogDescription>
            </DialogHeader>
            <NewTechnicianForm
              onSave={handleSaveTechnician}
              onCancel={() => setIsNewTechnicianDialogOpen(false)}
              isSaving={isSaving}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>Lista de técnicos da sua franquia.</CardDescription>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {franchiseTechnicians && franchiseTechnicians.length > 0 ? franchiseTechnicians.map((technician) => (
                  <TableRow key={technician.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={getAvatarUrl(technician.id)} alt={technician.firstName} />
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
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Nenhum técnico encontrado.</TableCell>
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

    