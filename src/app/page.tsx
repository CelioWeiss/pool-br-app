import { LoginForm } from '@/components/auth/login-form';
import { Droplets, Wrench } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-2 text-primary">
          <Droplets className="h-10 w-10" />
          <Wrench className="h-8 w-8" />
          <h1 className="text-4xl font-bold font-headline">
            Pool BR
          </h1>
        </div>
        <p className="text-muted-foreground">
          Limpeza e Manutenção
        </p>
      </div>
      <div className="w-full max-w-sm mt-12">
        <LoginForm />
      </div>
    </main>
  );
}
