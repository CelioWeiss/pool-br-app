"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as UserInfo, UserRole } from '@/lib/types';
import { useUser, useFirestore, useDoc, useMemoFirebase, initiateEmailSignIn } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';

interface AuthContextType {
  user: any | null;
  userInfo: UserInfo | null;
  isUserLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  authError: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading, userError } = useUser();
  const firestore = useFirestore();
  const [authError, setAuthError] = useState<Error | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user || pathname === '/') return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user, pathname]);
  
  const { data: userInfo, isLoading: isUserInfoLoading } = useDoc<UserInfo>(userDocRef);

  useEffect(() => {
    const totalLoading = isUserLoading || isUserInfoLoading;
    if (totalLoading) return;
    
    const isAuthPage = pathname === '/';
    const isDashboardPage = pathname.startsWith('/dashboard');
    const isLoggedIn = !!user && !!userInfo;

    if (isLoggedIn) {
      if (isAuthPage) {
        router.replace('/dashboard');
      }
    } else {
      if (isDashboardPage) {
        router.replace('/');
      }
    }
  }, [user, userInfo, isUserLoading, isUserInfoLoading, router, pathname]);
  
  useEffect(() => {
    if (userError) {
      setAuthError(userError);
    }
  }, [userError]);

  const login = useCallback(async (email: string, password: string) => {
    const auth = getAuth();
    setAuthError(null);
    try {
      // We are not awaiting this to avoid blocking, the onAuthStateChanged listener will handle the redirect
      initiateEmailSignIn(auth, email, password);
    } catch (e: any) {
      setAuthError(e);
      throw e; // re-throw to be caught by the form
    }
  }, []);

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
