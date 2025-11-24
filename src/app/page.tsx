'use client';

import { useEffect } from 'react';
import { ProfileSelector } from '@/components/auth/profile-selector';
import Image from 'next/image';
import { useFirestore } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';


// Temporary function to seed the master user
async function seedMasterUser(firestore: any) {
    if (!firestore) return;
    const masterUserId = 'master-admin-01';
    const userRef = doc(firestore, 'users', masterUserId);
    
    try {
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.log("Master user not found, creating one...");
            const masterUser = {
                id: masterUserId,
                firstName: 'Master',
                lastName: 'Admin',
                email: 'master@poolbr.com',
                role: 'master',
                franchiseId: null,
                isActive: true,
                createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, masterUser);
            console.log("Master user created successfully.");
        }
    } catch (error) {
         console.error("Error seeding master user:", error);
    }
}


export default function Home() {
  const firestore = useFirestore();

  // Seed master user on component mount if it doesn't exist
  useEffect(() => {
    seedMasterUser(firestore);
  }, [firestore]);


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
