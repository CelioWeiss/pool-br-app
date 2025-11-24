"use client";

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export function LoginForm() {
  const { login, authError } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      // The redirect is handled by the AuthProvider
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro de Login",
        description: error.message || "Falha ao tentar fazer login.",
      });
      setIsLoading(false);
    }
  };
  
  React.useEffect(() => {
    if(authError) {
       toast({
        variant: "destructive",
        title: "Erro de Login",
        description: "Email ou senha inválidos.",
      });
      setIsLoading(false);
    }
  }, [authError, toast]);

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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={!email || !password || isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
