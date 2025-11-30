

"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Client, UserInfo, UserRole } from '@/lib/types';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { getAuth, signOut, signInWithEmailAndPassword, AuthError, onIdTokenChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';


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

function useProvideAuth() {
  const { user: firebaseUser, isUserLoading: isFirebaseUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => 
    firestore && firebaseUser ? doc(firestore, 'users', firebaseUser.uid) : null,
    [firestore, firebaseUser]
  );
  const { data: baseUserInfo, isLoading: isUserInfoLoading } = useDoc<UserInfo>(userDocRef);

  const [clientProfile, setClientProfile] = useState<Client | null>(null);
  const [isClientProfileLoading, setIsClientProfileLoading] = useState(false);
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const router = useRouter();

  const isCreatingUserRef = useRef(false);
  
  // Effect to fetch client-specific profile if user has 'client' role
  useEffect(() => {
    if (baseUserInfo?.role === 'client' && firestore && baseUserInfo.franchiseId) {
      setIsClientProfileLoading(true);
      const clientQuery = query(
        collection(firestore, `franchises/${baseUserInfo.franchiseId}/clients`), 
        where('userId', '==', baseUserInfo.id)
      );
      getDocs(clientQuery).then(snapshot => {
        if (!snapshot.empty) {
          setClientProfile(snapshot.docs[0].data() as Client);
        }
        setIsClientProfileLoading(false);
      }).catch(() => {
        setIsClientProfileLoading(false);
      });
    } else {
      setClientProfile(null);
    }
  }, [baseUserInfo, firestore]);
  
  const userInfo = useMemo(() => {
      if (!baseUserInfo) return null;
      if (baseUserInfo.role === 'client' && clientProfile) {
        return {
          ...baseUserInfo,
          firstName: clientProfile.contactName || baseUserInfo.firstName,
          lastName: '', // Client profile does not have separate last name
          avatarUrl: clientProfile.avatarUrl || baseUserInfo.avatarUrl,
        };
      }
      return baseUserInfo;
  }, [baseUserInfo, clientProfile]);


  useEffect(() => {
    if (
      !firestore ||
      !firebaseUser ||
      userInfo ||
      isUserInfoLoading ||
      isCreatingUserRef.current
    ) {
      return;
    }

    isCreatingUserRef.current = true;

    const userRef = doc(firestore, "users", firebaseUser.uid);

    getDoc(userRef).then(docSnap => {
      if (!docSnap.exists()) {
        const email = firebaseUser.email || "";
        const nameParts =
          firebaseUser.displayName?.split(" ") || [email.split("@")[0], ""];
        const isMaster = email === "master@poolbr.com";

        const newUserInfo: UserInfo = {
          id: firebaseUser.uid,
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" "),
          email: email,
          role: isMaster ? "master" : "owner",
          franchiseId: null,
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        setDoc(userRef, newUserInfo);
      }
    });
  }, [firestore, firebaseUser, userInfo, isUserInfoLoading]);

  const login = useCallback(async (email: string, pass: string): Promise<{ ok: boolean, error?: string, redirect?: string }> => {
    setIsLoggingIn(true);
    setAuthError(null);
    const auth = getAuth();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // No need to call setIsLoggingIn(false) here, as the component will re-render on user state change.
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
  
  return useMemo(() => ({
    user: firebaseUser,
    userInfo: userInfo || null,
    isUserLoading: isFirebaseUserLoading || isUserInfoLoading || isClientProfileLoading,
    isLoggingIn,
    login,
    logout,
    hasRole,
    authError,
  }), [firebaseUser, userInfo, isFirebaseUserLoading, isUserInfoLoading, isClientProfileLoading, isLoggingIn, login, logout, hasRole, authError]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useProvideAuth();
  return (
    <AuthContext.Provider value={auth}>
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
