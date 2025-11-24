"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as UserInfo, UserRole } from '@/lib/types';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { getAuth, signOut, signInWithEmailAndPassword, AuthError } from 'firebase/auth';
import { doc } from 'firebase/firestore';

interface AuthContextType {
  user: any | null;
  userInfo: UserInfo | null;
  isUserLoading: boolean;
  isLoggingIn: boolean; // Specific state for login action
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  authError: AuthError | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading: isFirebaseUserLoading, userError } = useUser();
  const firestore = useFirestore();
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false); // State for login process
  const router = useRouter();
  const pathname = usePathname();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  
  const { data: userInfo, isLoading: isUserInfoLoading } = useDoc<UserInfo>(userDocRef);

  const isUserLoading = isFirebaseUserLoading || (!!user && isUserInfoLoading);

  useEffect(() => {
    if (isUserLoading || isLoggingIn) return; // Wait for all loading to finish
    
    const isAuthPage = pathname === '/';
    const isLoggedIn = !!user && !!userInfo;

    if (isLoggedIn) {
      if (isAuthPage) {
        router.replace('/dashboard');
      }
    } else {
      if (pathname.startsWith('/dashboard')) {
        router.replace('/');
      }
    }
  }, [user, userInfo, isUserLoading, isLoggingIn, router, pathname]);
  
  useEffect(() => {
    if (userError) {
      setAuthError(userError as AuthError);
    }
  }, [userError]);

  const login = useCallback(async (email: string, password: string) => {
    const auth = getAuth();
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged and the useEffect above will handle redirection.
    } catch (e: any) {
      setAuthError(e);
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(() => {
    const auth = getAuth();
    signOut(auth).then(() => {
      // The useEffect hook will handle redirection to '/'
    });
  }, []);

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
