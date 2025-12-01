

"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Client, UserInfo, UserRole } from '@/lib/types';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { getAuth, signOut, signInWithEmailAndPassword, AuthError, onIdTokenChanged, User as FirebaseUser, Auth } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';


interface AuthContextType {
  user: FirebaseUser | null;
  auth: Auth;
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
  const auth = getAuth();

  const userDocRef = useMemo(() => 
    firestore && firebaseUser ? doc(firestore, 'users', firebaseUser.uid) : null,
    [firestore, firebaseUser]
  );
  const { data: baseUserInfo, isLoading: isUserInfoLoading } = useDoc<UserInfo>(userDocRef);

  // This query finds the client document associated with the logged-in user.
  const clientQuery = useMemo(() => {
    if (firestore && baseUserInfo?.role === 'client' && baseUserInfo.franchiseId && baseUserInfo.id) {
      return query(
        collection(firestore, 'franchises', baseUserInfo.franchiseId, 'clients'),
        where('userId', '==', baseUserInfo.id),
        limit(1)
      );
    }
    return null;
  }, [firestore, baseUserInfo]);

  const { data: clientDocs, isLoading: isClientLoading } = useCollection<Client>(clientQuery);
  const clientProfile = useMemo(() => clientDocs?.[0] ?? null, [clientDocs]);


  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const router = useRouter();

  const isCreatingUserRef = useRef(false);
  
  const userInfo = useMemo(() => {
      if (!baseUserInfo) return null;
      // If the user is a client and we have found their specific client profile,
      // we merge the data to get the correct avatar and display name.
      if (baseUserInfo.role === 'client' && clientProfile) {
        return {
          ...baseUserInfo,
          // Prefer the contact name from the client record, fall back to user's first name
          firstName: clientProfile.contactName || baseUserInfo.firstName,
          lastName: '', // Client profile does not have a separate last name
          // Prefer the avatar from the client record, fall back to user's avatar
          avatarUrl: clientProfile.avatarUrl || baseUserInfo.avatarUrl,
        };
      }
      // For all other roles, or if client profile isn't loaded yet, return the base user info.
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
  }, [auth]);

  const logout = useCallback(() => {
    signOut(auth).then(() => {
        router.push('/');
    });
  }, [auth, router]);

  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!userInfo) return false;
    const rolesToCheck = Array.isArray(roles) ? roles : [roles];
    return rolesToCheck.includes(userInfo.role);
  }, [userInfo]);
  
  return useMemo(() => ({
    user: firebaseUser,
    auth,
    userInfo: userInfo || null,
    isUserLoading: isFirebaseUserLoading || isUserInfoLoading || isClientLoading,
    isLoggingIn,
    login,
    logout,
    hasRole,
    authError,
  }), [firebaseUser, auth, userInfo, isFirebaseUserLoading, isUserInfoLoading, isClientLoading, isLoggingIn, login, logout, hasRole, authError]);
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
