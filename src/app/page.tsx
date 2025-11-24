import { LoginForm } from '@/components/auth/login-form';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const logo = PlaceHolderImages.find(p => p.id === 'logo-color');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="flex flex-col items-center space-y-4">
        {logo && (
          <Image 
            src={logo.imageUrl}
            alt="Pool BR Logo" 
            width={200} 
            height={100}
            className="object-contain"
            data-ai-logo
          />
        )}
        <p className="text-muted-foreground -mt-2">
          Limpeza e Manutenção
        </p>
      </div>
      <div className="w-full max-w-sm mt-10">
        <LoginForm />
      </div>
    </main>
  );
}
