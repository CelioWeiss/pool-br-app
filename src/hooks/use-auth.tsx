"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as UserInfo, UserRole } from '@/lib/types';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { getAuth, signInAnonymously, signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';


interface AuthContextType {
  user: any | null;
  userInfo: UserInfo | null;
  isUserLoading: boolean;
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
  const router = useRouter();
  const pathname = usePathname();

  // HACK: For anonymous "impersonation", we check local storage.
  const impersonatedId = typeof window !== 'undefined' ? localStorage.getItem('impersonatedUserId') : null;
  
  const finalUserDocRef = useMemoFirebase(() => {
    if (impersonatedId) {
        return doc(firestore, 'users', impersonatedId);
    }
    // If not impersonating, we don't need user info on the auth pages.
    if (!user || pathname === '/') return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user, impersonatedId, pathname]);
  
  const { data: finalUserInfo, isLoading: isFinalUserInfoLoading } = useDoc<UserInfo>(finalUserDocRef);

  // Auto-login anonymously if not logged in and on the login page
  useEffect(() => {
      const auth = getAuth();
      if (!user && !isUserLoading && pathname === '/') {
          signInAnonymously(auth).catch(e => {
              console.error("Auto anonymous login failed:", e);
              setAuthError(e);
          });
      }
  }, [user, isUserLoading, pathname]);
  
  useEffect(() => {
    const totalLoading = isUserLoading || isFinalUserInfoLoading;
    if (totalLoading) {
      return;
    }
    
    const isAuthPage = pathname === '/';
    const isDashboardPage = pathname.startsWith('/dashboard');

    // If we have impersonation data or real user data, we are "logged in"
    const isLoggedIn = !!finalUserInfo;

    if (isLoggedIn) {
      if (isAuthPage) {
        router.replace('/dashboard');
      }
    } else {
      // If not logged in and trying to access dashboard, go to login
      if (isDashboardPage) {
        router.replace('/');
      }
    }
  }, [user, finalUserInfo, isUserLoading, isFinalUserInfoLoading, router, pathname]);
  
  useEffect(() => {
    setAuthError(userError);
  }, [userError]);


  const anonymousLoginAs = useCallback(async (targetUser: UserInfo) => {
    // We are already logged in anonymously, just need to set the impersonation
    localStorage.setItem('impersonatedUserId', targetUser.id);
    // Force a reload or redirect to ensure the new state is picked up
    router.push('/dashboard');
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
    anonymousLoginAs,
    logout,
    hasRole,
    authError,
  }), [user, finalUserInfo, isUserLoading, isFinalUserInfoLoading, anonymousLoginAs, logout, hasRole, authError]);

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
