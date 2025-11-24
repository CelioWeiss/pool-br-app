
"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as UserInfo, UserRole } from '@/lib/types';
import { useUser } from '@/firebase';
import { getAuth, signOut, signInAnonymously, AuthError, onIdTokenChanged, User as FirebaseUser } from 'firebase/auth';
import { users } from '@/lib/data';

interface AuthContextType {
  user: FirebaseUser | null;
  userInfo: UserInfo | null;
  isUserLoading: boolean;
  isLoggingIn: boolean;
  anonymousLoginAs: (user: UserInfo) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  authError: AuthError | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If there's a Firebase user but no local userInfo, it might be from a real session.
        // For this demo, we prioritize the simulated login.
        // If userInfo is already set by anonymousLoginAs, we don't overwrite it.
        if (!userInfo) {
            // This part is for potential future real logins. For now, it keeps the session.
            setUser(firebaseUser);
        }
      } else {
        // User logged out
        setUser(null);
        setUserInfo(null);
      }
      setIsUserLoading(false);
    });

    return () => unsubscribe();
  }, [userInfo]);

  const anonymousLoginAs = useCallback(async (userToLogin: UserInfo) => {
    setIsLoggingIn(true);
    setAuthError(null);
    const auth = getAuth();
    try {
        const userCredential = await signInAnonymously(auth);
        setUser(userCredential.user);
        setUserInfo(userToLogin); // Directly set the user info from the selection
        
        let redirect = '/dashboard';
        if (userToLogin.role === 'technician') {
          redirect = '/dashboard/schedule';
        }
        router.push(redirect);

    } catch (err: any) {
        console.error("Anonymous login failed:", err);
        setAuthError(err);
    } finally {
        setIsLoggingIn(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    const auth = getAuth();
    signOut(auth).then(() => {
        setUserInfo(null); // Clear local user profile
        setUser(null);
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
    anonymousLoginAs,
    logout,
    hasRole,
    authError,
  }), [user, userInfo, isUserLoading, isLoggingIn, anonymousLoginAs, logout, hasRole, authError]);

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
