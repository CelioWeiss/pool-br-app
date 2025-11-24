'use client';

import { useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Spinner } from '../ui/spinner';
import { useRouter } from 'next/navigation';

export function ProfileSelector() {
  const { user, anonymousLoginAs, isUserLoading } = useAuth();
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
      // Wait for anonymous user to be ready
      if (!user) return null;
      return collection(firestore, 'users')
    }, [firestore, user]);
  
  const { data: userList, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

  const handleLogin = async (user: User) => {
    await anonymousLoginAs(user);
  };

  const getAvatar = (role: string) => {
    const idMap: Record<string, string> = {
        master: 'avatar1',
        owner: 'avatar2',
        technician: 'avatar3',
        client: 'avatar5',
    }
    return PlaceHolderImages.find(p => p.id === idMap[role])?.imageUrl || PlaceHolderImages.find(p => p.id === 'avatar1')?.imageUrl;
  }

  const isLoading = isUserLoading || areUsersLoading || !user;

  return (
    <Card className="shadow-2xl">
      <CardHeader>
        <CardTitle>Selecionar Perfil</CardTitle>
        <CardDescription>Escolha um perfil para entrar no sistema.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
            <div className="flex justify-center items-center h-24">
                <Spinner />
            </div>
        )}
        {!isLoading && userList?.map((user) => (
          <Button
            key={user.id}
            variant="outline"
            className="w-full h-16 justify-start p-3 gap-4"
            onClick={() => handleLogin(user)}
          >
            <Avatar className="h-10 w-10">
                <AvatarImage src={getAvatar(user.role)} />
                <AvatarFallback>{user.firstName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
                <span className="font-semibold">{user.firstName} {user.lastName}</span>
                <span className="text-sm text-muted-foreground capitalize">{user.role}</span>
            </div>
          </Button>
        ))}
         {!isLoading && !userList?.length && (
            <p className="text-center text-muted-foreground pt-4">Nenhum usuário encontrado. Crie um no seu banco de dados.</p>
         )}
      </CardContent>
    </Card>
  );
}
