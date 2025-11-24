"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';

export function LoginForm() {
  const { login, isLoggingIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState('master@poolbr.com');
  const [password, setPassword] = React.useState('');
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await login(email, password);

    if (!result.ok) {
      toast({
        variant: "destructive",
        title: "Erro de Login",
        description: result.error,
      });
    } else if (result.redirect) {
      router.push(result.redirect);
    }
    // No need for an else, the AuthProvider's useEffect will handle redirection
  };

  return (
    <Card className="shadow-2xl">
      <CardHeader>
        <CardTitle>Bem-vindo!</CardTitle>
        <CardDescription>Faça login para acessar o painel.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoggingIn}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoggingIn}
            />
          </div>
          <Button type="submit" className="w-full" disabled={!email || !password || isLoggingIn}>
            {isLoggingIn ? (
              <>
                <Spinner size="small" className="mr-2" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
