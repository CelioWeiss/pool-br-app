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
  isLoggingIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  authError: AuthError | null;
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
    // This effect handles redirection for users who are already logged in
    // or who get logged out.
    if (isUserLoading) return;
    
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
  }, [user, userInfo, isUserLoading, router, pathname]);

  const login = useCallback(async (email: string, password: string) => {
    const auth = getAuth();
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Let the onAuthStateChanged listener pick up the user and redirect via the useEffect.
    } catch (e: any) {
      setAuthError(e);
      setIsLoggingIn(false); // Stop loading on error
    }
    // isLoggingIn will be set to false by the loading effect once the user is fetched.
  }, [router]);

  const logout = useCallback(() => {
    const auth = getAuth();
    signOut(auth);
  }, []);

  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!userInfo) return false;
    const rolesToCheck = Array.isArray(roles) ? roles : [roles];
    return rolesToCheck.includes(userInfo.role);
  }, [userInfo]);

  // When the overall user loading state is resolved, we are no longer "logging in".
  useEffect(() => {
    if (!isUserLoading) {
      setIsLoggingIn(false);
    }
  }, [isUserLoading]);

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
