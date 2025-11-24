'use client';

import { useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { users as userList } from '@/lib/data';
import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Spinner } from '../ui/spinner';
import { Crown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function ProfileSelector() {
  const { anonymousLoginAs, isLoggingIn } = useAuth();

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
    const placeholder = PlaceHolderImages.find(p => p.id === idMap[role]) || PlaceHolderImages.find(p => p.id === 'avatar1');
    return placeholder?.imageUrl;
  }

  const isLoading = isLoggingIn;

  const masterUser = useMemo(() => userList.find(u => u.role === 'master'), []);
  const otherUsers = useMemo(() => userList.filter(u => u.role !== 'master'), []);


  return (
    <Card className="shadow-2xl">
      <CardHeader>
        <CardTitle>Selecionar Perfil</CardTitle>
        <CardDescription>Escolha um perfil de demonstração para entrar no sistema.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
            <div className="flex justify-center items-center h-48">
                <Spinner />
                <p className="ml-4">Entrando...</p>
            </div>
        )}

        {!isLoading && masterUser && (
           <>
            <Button
                size="lg"
                className="w-full h-18 justify-start p-4 gap-4 bg-primary/10 text-primary-foreground border-2 border-primary/50 hover:bg-primary/20"
                onClick={() => handleLogin(masterUser)}
                disabled={isLoading}
            >
                <Avatar className="h-12 w-12 border-2 border-primary/50">
                    <AvatarImage src={getAvatar(masterUser.role)} />
                    <AvatarFallback><Crown /></AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                    <span className="font-bold text-lg">{masterUser.firstName} {masterUser.lastName}</span>
                    <span className="text-sm text-primary-foreground/80 capitalize">{masterUser.role}</span>
                </div>
                <Crown className="ml-auto h-6 w-6 text-yellow-400" />
            </Button>
            <div className="flex items-center gap-2 py-2">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">Outros Perfis</span>
                <Separator className="flex-1" />
            </div>
           </>
        )}

        {!isLoading && otherUsers?.map((user) => (
          <Button
            key={user.id}
            variant="outline"
            className="w-full h-16 justify-start p-3 gap-4"
            onClick={() => handleLogin(user)}
            disabled={isLoading}
          >
            <Avatar className="h-10 w-10">
                <AvatarImage src={getAvatar(user.role)} />
                <AvatarFallback>{user.firstName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
                <span className="font-semibold">{user.firstName} {user.lastName}</span>
                <span className="text-sm text-muted-foreground capitalize">{user.role} ({user.franchiseId})</span>
            </div>
          </Button>
        ))}
         {!isLoading && !userList?.length && (
            <p className="text-center text-muted-foreground pt-4">Nenhum usuário de demonstração encontrado.</p>
         )}
      </CardContent>
    </Card>
  );
}
