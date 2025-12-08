
'use client';

import { useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { users as userList } from '@/lib/data';
import type { UserInfo } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Spinner } from '../ui/spinner';
import { Crown, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function ProfileSelector() {
  const { anonymousLoginAs, isLoggingIn } = useAuth();

  const handleLogin = async (user: UserInfo) => {
    await anonymousLoginAs(user);
  };

  const getAvatar = (role: string) => {
    const idMap: Record<string, string> = {
        master: 'avatar1',
    }
    const placeholder = PlaceHolderImages.find(p => p.id === idMap[role]) || PlaceHolderImages.find(p => p.id === 'avatar1');
    return placeholder?.imageUrl;
  }

  const isLoading = isLoggingIn;

  const masterUsers = useMemo(() => userList.filter(u => u.role === 'master'), []);
  
  if (masterUsers.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Nenhum Perfil Disponível</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground pt-4">Nenhum usuário de demonstração configurado.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="shadow-2xl">
      <CardHeader>
        <CardTitle>Entrar como Administrador</CardTitle>
        <CardDescription>Clique em um perfil para acessar o sistema.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
            <div className="flex justify-center items-center h-48">
                <Spinner />
                <p className="ml-4">Entrando...</p>
            </div>
        )}

        {!isLoading && masterUsers.map((user) => (
           <Button
                key={user.id}
                size="lg"
                className="w-full h-18 justify-start p-4 gap-4 bg-primary/10 text-primary-foreground border-2 border-primary/50 hover:bg-primary/20"
                onClick={() => handleLogin(user)}
                disabled={isLoading}
            >
                <Avatar className="h-12 w-12 border-2 border-primary/50">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback><User /></AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                    <span className="font-bold text-lg">{user.firstName} {user.lastName}</span>
                    <span className="text-sm text-primary-foreground/80 capitalize">{user.role}</span>
                </div>
                <Crown className="ml-auto h-6 w-6 text-yellow-400" />
            </Button>
        ))}
      </CardContent>
    </Card>
  );
}
