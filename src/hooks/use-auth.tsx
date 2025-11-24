
"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as UserInfo, UserRole } from '@/lib/types';
import { useUser } from '@/firebase';
import { getAuth, signOut, signInWithEmailAndPassword, signInAnonymously, AuthError } from 'firebase/auth';
import { users as demoUsers } from '@/lib/data';

interface AuthContextType {
  user: any | null; // Firebase Auth user
  userInfo: UserInfo | null; // Demo user profile
  isUserLoading: boolean;
  isLoggingIn: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; redirect?: string }>;
  anonymousLoginAs: (user: UserInfo) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  authError: AuthError | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading: isFirebaseUserLoading } = useUser();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  const isUserLoading = isFirebaseUserLoading || isLoggingIn;

  useEffect(() => {
    if (isUserLoading) return;
    
    const isAuthPage = pathname === '/';
    const isLoggedIn = !!user && !!userInfo;

    if (isLoggedIn) {
      if (isAuthPage) {
        // Determine redirect based on role
        let redirect = '/dashboard'; // Default dashboard
        if (userInfo.role === 'technician') {
          redirect = '/dashboard/schedule';
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
    setAuthError(null);
    const auth = getAuth();
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Let onAuthStateChanged handle the user object and useEffect handle redirection
      // Find and set the corresponding demo user
      const demoUser = demoUsers.find(u => u.email === email);
      if (demoUser) {
        setUserInfo(demoUser);
        return { ok: true };
      }
      return { ok: false, error: "Perfil de demonstração não encontrado." };
    } catch (err: any) {
      const errorMap: Record<string, string> = {
        "auth/invalid-email": "E-mail inválido.",
        "auth/user-not-found": "Usuário não encontrado.",
        "auth/wrong-password": "Senha incorreta.",
        "auth/invalid-credential": "E-mail ou senha incorretos.",
        "auth/too-many-requests": "Muitas tentativas. Aguarde e tente novamente.",
        "auth/user-disabled": "Este usuário foi desativado.",
      };
      const errorMessage = errorMap[err.code] || err.message || "Erro desconhecido.";
      setAuthError(err);
      return { ok: false, error: errorMessage };
    } finally {
        setIsLoggingIn(false);
    }
  }, []);

  const anonymousLoginAs = useCallback(async (demoUser: UserInfo) => {
    setIsLoggingIn(true);
    setAuthError(null);
    const auth = getAuth();
    try {
        await signInAnonymously(auth);
        setUserInfo(demoUser);
        // Redirection will be handled by the useEffect
    } catch (err: any) {
        setAuthError(err);
        console.error("Anonymous login failed", err);
    } finally {
        setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(() => {
    const auth = getAuth();
    signOut(auth).then(() => {
        setUserInfo(null); // Clear local user profile
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
    anonymousLoginAs,
    logout,
    hasRole,
    authError,
  }), [user, userInfo, isUserLoading, isLoggingIn, login, anonymousLoginAs, logout, hasRole, authError]);

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
