"use client";

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export function LoginForm() {
  const { login, authError, isUserLoading } = useAuth();
  const [email, setEmail] = React.useState('master@poolbr.com');
  const [password, setPassword] = React.useState('password'); // Default for demo
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await login(email, password);
    // Don't set isLoading to false here, let the redirect happen
  };
  
  React.useEffect(() => {
    if(authError) {
       toast({
        variant: "destructive",
        title: "Erro de Login",
        description: "Email ou senha inválidos. Verifique suas credenciais.",
      });
      setIsLoading(false); // Stop loading on error
    }
  }, [authError, toast]);

  const internalIsLoading = isLoading || isUserLoading;

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
              disabled={internalIsLoading}
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
              disabled={internalIsLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={!email || !password || internalIsLoading}>
            {internalIsLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
