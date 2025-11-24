"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as UserInfo, UserRole } from '@/lib/types';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { getAuth, signInAnonymously, signOut, updateProfile } from 'firebase/auth';
import { doc } from 'firebase/firestore';


interface AuthContextType {
  user: any | null;
  userInfo: UserInfo | null;
  isUserLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  anonymousLoginAs: (targetUser: UserInfo) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  authError: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading, userError } = useUser();
  const firestore = useFirestore();
  const [authError, setAuthError] = useState<Error | null>(null);

  // HACK: For anonymous "impersonation", we check local storage.
  const impersonatedId = typeof window !== 'undefined' ? localStorage.getItem('impersonatedUserId') : null;
  
  const finalUserDocRef = useMemoFirebase(() => {
    if (impersonatedId) {
        return doc(firestore, 'users', impersonatedId);
    }
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user, impersonatedId]);
  
  const { data: finalUserInfo, isLoading: isFinalUserInfoLoading } = useDoc<UserInfo>(finalUserDocRef);
  
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    const totalLoading = isUserLoading || isFinalUserInfoLoading;
    if (totalLoading) {
      return;
    }
    
    const isAuthPage = pathname === '/';
    const isDashboardPage = pathname.startsWith('/dashboard');

    if (user && finalUserInfo) {
      if (isAuthPage) {
        router.replace('/dashboard');
      }
    } else {
      if (isDashboardPage) {
        router.replace('/');
      }
    }
  }, [user, finalUserInfo, isUserLoading, isFinalUserInfoLoading, router, pathname]);
  
  useEffect(() => {
    setAuthError(userError);
  }, [userError]);

  const login = useCallback(async (email: string, pass: string) => {
    const auth = getAuth();
    initiateEmailSignIn(auth, email, pass);
  }, []);

  const anonymousLoginAs = useCallback(async (targetUser: UserInfo) => {
    const auth = getAuth();
    try {
      await signInAnonymously(auth);
      // This is a workaround: we store the ID of the user we want to be.
      localStorage.setItem('impersonatedUserId', targetUser.id);
      // Force a reload or redirect to ensure the new state is picked up
      router.push('/dashboard');
    } catch (e) {
      console.error("Anonymous login failed", e);
    }
  }, [router]);


  const logout = useCallback(() => {
    const auth = getAuth();
    localStorage.removeItem('impersonatedUserId');
    signOut(auth).then(() => {
      router.push('/');
    });
  }, [router]);

  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!finalUserInfo) return false;
    const rolesToCheck = Array.isArray(roles) ? roles : [roles];
    return rolesToCheck.includes(finalUserInfo.role);
  }, [finalUserInfo]);

  const value = useMemo(() => ({
    user,
    userInfo: finalUserInfo,
    isUserLoading: isUserLoading || isFinalUserInfoLoading,
    login,
    anonymousLoginAs,
    logout,
    hasRole,
    authError,
  }), [user, finalUserInfo, isUserLoading, isFinalUserInfoLoading, login, anonymousLoginAs, logout, hasRole, authError]);

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
