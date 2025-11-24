import { ProfileSelector } from '@/components/auth/profile-selector';
import Image from 'next/image';

export default function Home() {

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="flex flex-col items-center space-y-4">
          <Image 
            src="https://i.postimg.cc/9f4MNdf7/Design-sem-nome-1-removebg-preview-1.png"
            alt="Pool BR Logo" 
            width={200} 
            height={100}
            className="object-contain"
            data-ai-logo
          />
        <p className="text-muted-foreground -mt-2">
          Limpeza e Manutenção
        </p>
      </div>
      <div className="w-full max-w-sm mt-10">
        <ProfileSelector />
      </div>
    </main>
  );
}
