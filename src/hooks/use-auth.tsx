

"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { UserInfo, UserRole } from '@/lib/types';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { getAuth, signOut, signInWithEmailAndPassword, AuthError, onIdTokenChanged, User as FirebaseUser } from 'firebase/auth';
import { doc } from 'firebase/firestore';


interface AuthContextType {
  user: FirebaseUser | null;
  userInfo: UserInfo | null;
  isUserLoading: boolean;
  isLoggingIn: boolean;
  login: (email: string, pass: string) => Promise<{ ok: boolean, error?: string, redirect?: string }>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  authError: AuthError | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: firebaseUser, isUserLoading: isFirebaseUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => 
    firestore && firebaseUser ? doc(firestore, 'users', firebaseUser.uid) : null,
    [firestore, firebaseUser]
  );
  const { data: userInfo, isLoading: isUserInfoLoading } = useDoc<UserInfo>(userDocRef);
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const router = useRouter();

  const login = useCallback(async (email: string, pass: string): Promise<{ ok: boolean, error?: string, redirect?: string }> => {
    setIsLoggingIn(true);
    setAuthError(null);
    const auth = getAuth();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onIdTokenChanged and useDoc will handle the rest
      setIsLoggingIn(false);
      return { ok: true, redirect: '/dashboard' };
    } catch (err: any) {
      console.error("Login failed:", err);
      setAuthError(err);
      setIsLoggingIn(false);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        return { ok: false, error: 'E-mail ou senha inválidos.' };
      }
      return { ok: false, error: err.message || 'Ocorreu um erro desconhecido.' };
    }
  }, [router]);

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
    user: firebaseUser,
    userInfo: userInfo || null,
    isUserLoading: isFirebaseUserLoading || isUserInfoLoading,
    isLoggingIn,
    login,
    logout,
    hasRole,
    authError,
  }), [firebaseUser, userInfo, isFirebaseUserLoading, isUserInfoLoading, isLoggingIn, login, logout, hasRole, authError]);

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
