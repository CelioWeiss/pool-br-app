
"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import type { Technician, UserInfo } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewTechnicianForm, type NewTechnicianFormData } from '@/components/dashboard/technicians/new-technician-form';
import { useToast } from '@/hooks/use-toast';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';


export default function TechniciansPage() {
  const { userInfo, hasRole, user: adminUser } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const auth = useMemo(() => getAuth(), []);
  const router = useRouter();

  const franchiseId = userInfo?.franchiseId;

  const techniciansQuery = useMemo(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'technicians') : null
  , [firestore, franchiseId]);

  const { data: franchiseTechnicians, isLoading } = useCollection<Technician>(techniciansQuery);

  const [isNewTechnicianDialogOpen, setIsNewTechnicianDialogOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  if (!hasRole('owner') || !franchiseId) {
    return <p>Acesso negado.</p>;
  }
  
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setEditingTechnician(null);
    }
    setIsNewTechnicianDialogOpen(open);
  }

  const handleEditClick = (technician: Technician) => {
    setEditingTechnician(technician);
    setIsNewTechnicianDialogOpen(true);
  }

  const handleSaveTechnician = async (data: NewTechnicianFormData) => {
    if (!firestore || !franchiseId || !auth || !adminUser?.email) return;
    setIsSaving(true);
    
    const batch = writeBatch(firestore);
    const [firstName, ...lastNameParts] = data.name.split(' ');
    
    try {
      if (editingTechnician) {
        // UPDATE existing technician
        const technicianRef = doc(firestore, 'franchises', franchiseId, 'technicians', editingTechnician.id);
        const technicianUpdateData: Partial<Technician> = {
          firstName: firstName,
          lastName: lastNameParts.join(' ') || '',
          phone: data.phone,
          email: data.email, // Note: email changes here won't affect Firebase Auth email
        };
        batch.update(technicianRef, technicianUpdateData);
        
        if (editingTechnician.userId) {
            const userProfileRef = doc(firestore, 'users', editingTechnician.userId);
            const userUpdateData: Partial<UserInfo> = {
                firstName: firstName,
                lastName: lastNameParts.join(' ') || '',
                email: data.email,
            };
            batch.update(userProfileRef, userUpdateData);
        }

      } else {
        // CREATE new technician
        // 1. Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password!);
        const newUserId = userCredential.user.uid;

        // 2. Create Technician document
        const technicianRef = doc(collection(firestore, 'franchises', franchiseId, 'technicians'));
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

        // 3. Create User Profile document
        const userProfileRef = doc(firestore, 'users', newUserId);
        const newUserProfile: UserInfo = {
          id: newUserId,
          firstName: firstName,
          lastName: lastNameParts.join(' ') || '',
          email: data.email,
          role: 'technician',
          franchiseId: franchiseId,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        batch.set(userProfileRef, newUserProfile);
      }

      // 4. Commit batch
      await batch.commit();

      toast({
        title: editingTechnician ? "Técnico Atualizado!" : "Técnico Criado!",
        description: `O técnico ${data.name} foi salvo com sucesso.`,
      });
      handleDialogChange(false);

    } catch (error: any) {
      console.error("Error saving technician:", error);
      let description = "Ocorreu um erro ao salvar o técnico.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este e-mail já está em uso por outro usuário.";
      } else if (error.code === 'auth/weak-password') {
        description = "A senha é muito fraca. Use pelo menos 6 caracteres.";
      }
      toast({
        variant: 'destructive',
        title: "Erro ao salvar",
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
        <Dialog open={isNewTechnicianDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Técnico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTechnician ? 'Editar Técnico' : 'Adicionar Novo Técnico'}</DialogTitle>
              <DialogDescription>
                {editingTechnician ? 'Atualize os dados do técnico.' : 'Preencha os dados abaixo para cadastrar um novo técnico e criar seu acesso.'}
              </DialogDescription>
            </DialogHeader>
            <NewTechnicianForm
              technician={editingTechnician}
              onSave={handleSaveTechnician}
              onCancel={() => handleDialogChange(false)}
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
                          <AvatarImage src={technician.avatarUrl} alt={technician.firstName} />
                          <AvatarFallback>{technician.firstName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {technician.firstName} {technician.lastName}
                      </div>
                    </TableCell>
                    <TableCell>{technician.phone}</TableCell>
                     <TableCell>{technician.email}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(technician)}>Editar</Button>
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

    