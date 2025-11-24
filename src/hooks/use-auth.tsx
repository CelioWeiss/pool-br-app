"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as UserInfo, UserRole } from '@/lib/types';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { getAuth, signOut, signInWithEmailAndPassword, AuthError } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: any | null;
  userInfo: UserInfo | null;
  isUserLoading: boolean;
  isLoggingIn: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; redirect?: string }>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  authError: AuthError | null; // This can be removed or refactored if not used in toasts anymore
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading: isFirebaseUserLoading } = useUser();
  const firestore = useFirestore();
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  
  const { data: userInfo, isLoading: isUserInfoLoading } = useDoc<UserInfo>(userDocRef);

  const isUserLoading = isFirebaseUserLoading || (!!user && isUserInfoLoading);

  useEffect(() => {
    if (isUserLoading) return;
    
    const isAuthPage = pathname === '/';
    const isLoggedIn = !!user && !!userInfo;

    if (isLoggedIn) {
      if (isAuthPage) {
        // Determine redirect based on role, similar to the login function logic
        let redirect = '/dashboard'; // Default dashboard
        if (userInfo.role === 'master') {
          redirect = '/dashboard';
        } else if (userInfo.role === 'owner' && userInfo.franchiseId) {
          redirect = '/dashboard';
        } else if (userInfo.role === 'technician') {
          redirect = '/dashboard/schedule';
        } else if (userInfo.role === 'client') {
          redirect = '/dashboard';
        }
        router.replace(redirect);
      }
    } else {
      if (pathname.startsWith('/dashboard')) {
        router.replace('/');
      }
    }
  }, [user, userInfo, isUserLoading, router, pathname]);

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string; redirect?: string }> => {
    setIsLoggingIn(true);
    const auth = getAuth();
    
    try {
      // 1 — LOGIN NO FIREBASE AUTH
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      if (!loggedInUser) {
        throw new Error("Usuário não retornado pelo Firebase.");
      }

      // 2 — BUSCAR PERFIL NO FIRESTORE
      const profileRef = doc(firestore, "users", loggedInUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        await signOut(auth); // Log out user if profile doesn't exist
        throw new Error("Perfil não encontrado no Firestore. Entre em contato com o suporte.");
      }

      const data = profileSnap.data();

      // 3 — VERIFICA SE TEM ROLE DEFINIDA
      if (!data.role) {
         await signOut(auth); // Log out user if role is missing
        throw new Error("O usuário não possui uma função atribuída (role undefined).");
      }
      
      // The useEffect will handle redirection based on the new `userInfo` state.
      // We just need to signal success.
      setIsLoggingIn(false);
      return { ok: true, redirect: '/dashboard' };

    } catch (err: any) {
      console.error("Erro no login:", err);
      setIsLoggingIn(false);

      // TRATAMENTO COMPLETO DE ERROS DO FIREBASE AUTH
      const errorMap: Record<string, string> = {
        "auth/invalid-email": "E-mail inválido.",
        "auth/user-not-found": "Usuário não encontrado.",
        "auth/wrong-password": "Senha incorreta.",
        "auth/invalid-credential": "E-mail ou senha incorretos.",
        "auth/too-many-requests": "Muitas tentativas. Aguarde e tente novamente.",
        "auth/user-disabled": "Este usuário foi desativado.",
      };
      
      const errorMessage = errorMap[err.code] || err.message || "Erro desconhecido.";
      setAuthError(err); // Keep original error if needed elsewhere

      return {
        ok: false,
        error: errorMessage,
      };
    }
  }, [firestore]);

  const logout = useCallback(() => {
    const auth = getAuth();
    signOut(auth).then(() => {
        router.push('/');
    });
  }, [router]);

  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!userInfo) return false;
    const rolesToCheck = Array.isArray(roles) ? roles : [roles];
    return rolesToCheck.includes(userInfo.role);
  }, [userInfo]);
  
  const value = useMemo(() => ({
    user,
    userInfo,
    isUserLoading,
    isLoggingIn,
    login,
    logout,
    hasRole,
    authError,
  }), [user, userInfo, isUserLoading, isLoggingIn, login, logout, hasRole, authError]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
