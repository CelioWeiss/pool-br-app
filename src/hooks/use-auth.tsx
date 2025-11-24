"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User as UserInfo, UserRole } from '@/lib/types';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { getAuth, signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';


interface AuthContextType {
  user: any | null;
  userInfo: UserInfo | null;
  isUserLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  authError: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading, userError } = useUser();
  const firestore = useFirestore();
  const [authError, setAuthError] = useState<Error | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userInfo, isLoading: isUserInfoLoading } = useDoc<UserInfo>(userDocRef);
  
  const router = useRouter();
  
  useEffect(() => {
    if (!isUserLoading && !isUserInfoLoading && user && userInfo) {
      if(window.location.pathname === '/') {
          router.push('/dashboard');
      }
    } else if (!isUserLoading && !user) {
       if(window.location.pathname.startsWith('/dashboard')) {
          router.push('/');
       }
    }
  }, [user, userInfo, isUserLoading, isUserInfoLoading, router])
  
  useEffect(() => {
    setAuthError(userError);
  }, [userError])

  const login = useCallback(async (email: string, pass: string) => {
    const auth = getAuth();
    // Non-blocking call
    initiateEmailSignIn(auth, email, pass);
  }, []);

  const logout = useCallback(() => {
    const auth = getAuth();
    signOut(auth);
    router.push('/');
  }, [router]);

  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!userInfo) return false;
    const rolesToCheck = Array.isArray(roles) ? roles : [roles];
    return rolesToCheck.includes(userInfo.role);
  }, [userInfo]);

  const value = useMemo(() => ({
    user,
    userInfo,
    isUserLoading: isUserLoading || isUserInfoLoading,
    login,
    logout,
    hasRole,
    authError,
  }), [user, userInfo, isUserLoading, isUserInfoLoading, login, logout, hasRole, authError]);

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
