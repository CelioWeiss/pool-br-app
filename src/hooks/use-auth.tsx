
"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as UserInfo, UserRole } from '@/lib/types';
import { useUser } from '@/firebase';
import { getAuth, signOut, signInWithEmailAndPassword, AuthError } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore";
import { useFirestore } from '@/firebase/provider';

interface AuthContextType {
  user: any | null; // Firebase Auth user
  userInfo: UserInfo | null; // Demo user profile
  isUserLoading: boolean;
  isLoggingIn: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; redirect?: string }>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  authError: AuthError | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading: isFirebaseUserLoading } = useUser();
  const firestore = useFirestore();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  const isUserLoading = isFirebaseUserLoading || isLoggingIn;

  useEffect(() => {
    // This effect now correctly handles loading userInfo from Firestore after Firebase user is loaded
    const fetchUserInfo = async () => {
      if (user && !userInfo && firestore) {
        const profileRef = doc(firestore, "users", user.uid);
        try {
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            const data = profileSnap.data() as UserInfo;
            if (data.role) {
              setUserInfo(data);
            } else {
              console.error("User profile is missing role. Logging out.");
              logout();
            }
          } else {
            console.error("User profile not found in Firestore. Logging out.");
            logout();
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          logout();
        }
      } else if (!user) {
        setUserInfo(null); // Clear user info if firebase user is null
      }
    };

    fetchUserInfo();
  }, [user, firestore, userInfo]); // Dependency on `user` is key

  useEffect(() => {
    if (isUserLoading) return;
    
    const isAuthPage = pathname === '/';
    const isLoggedIn = !!user && !!userInfo;

    if (isLoggedIn) {
      if (isAuthPage) {
        let redirect = '/dashboard';
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
      // The user state will be updated by onAuthStateChanged, and the useEffect above will handle fetching user info and redirection.
      // We don't need to manually set user info or redirect here.
      return { ok: true };

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
      
      if (err.code?.startsWith('auth/')) {
        setAuthError(err);
      }

      // No need to create a FirestorePermissionError here, as the primary error is with Auth.
      return { ok: false, error: errorMessage };
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
