"use client";

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { users } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function LoginForm() {
  const { login } = useAuth();
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserId) {
      setIsLoading(true);
      // Simulate network delay
      setTimeout(() => {
        login(selectedUserId);
      }, 500);
    }
  };

  return (
    <Card className="shadow-2xl">
      <CardHeader>
        <CardTitle>Bem-vindo!</CardTitle>
        <CardDescription>Selecione um usuário para simular o login.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-6">
          <Select onValueChange={setSelectedUserId} disabled={isLoading}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um perfil de usuário..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" className="w-full" disabled={!selectedUserId || isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
