
"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { UserInfo, UserRole } from "@/lib/types";
import { useUser, useFirestore, useDoc } from "@/firebase";
import {
  getAuth,
  signOut,
  signInWithEmailAndPassword,
  AuthError,
  User as FirebaseUser,
  Auth,
  signInAnonymously,
} from "firebase/auth";
import {
  doc,
  setDoc,
} from "firebase/firestore";

interface AuthContextType {
  user: FirebaseUser | null;
  auth: Auth;
  userInfo: UserInfo | null;

  isUserLoading: boolean;
  isLoggingIn: boolean;
  login: (
    email: string,
    pass: string
  ) => Promise<{ ok: boolean; error?: string; redirect?: string }>;
  anonymousLoginAs: (user: UserInfo) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  authError: AuthError | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useProvideAuth() {
  const { user: firebaseUser, isUserLoading: isFirebaseUserLoading } =
    useUser();
  const firestore = useFirestore();
  const auth = getAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  const [anonymousProfile, setAnonymousProfile] = useState<UserInfo | null>(null);


  const userDocRef = useMemo(() => {
    if (!firestore || !firebaseUser?.uid || firebaseUser.isAnonymous) return null;
    return doc(firestore, "users", firebaseUser.uid);
  }, [firestore, firebaseUser]);

  const {
    data: userInfo,
    isLoading: isUserInfoLoading,
  } = useDoc<UserInfo>(userDocRef);


  useEffect(() => {
    if (firebaseUser && !firebaseUser.isAnonymous) {
      setAnonymousProfile(null);
    }
  }, [firebaseUser]);


  const login = useCallback(
    async (
      email: string,
      pass: string
    ): Promise<{ ok: boolean; error?: string; redirect?: string }> => {
      setIsLoggingIn(true);
      setAuthError(null);

      try {
        await signInWithEmailAndPassword(auth, email, pass);
        setIsLoggingIn(false);
        return { ok: true, redirect: "/dashboard" };

      } catch (err: any) {
        console.error("Login failed:", err);
        setAuthError(err);
        setIsLoggingIn(false);

        if (
          err.code === "auth/user-not-found" ||
          err.code === "auth/wrong-password" ||
          err.code === "auth/invalid-credential"
        ) {
          return { ok: false, error: "E-mail ou senha inválidos." };
        }

        return {
          ok: false,
          error: err.message || "Ocorreu um erro desconhecido.",
        };
      }
    },
    [auth]
  );
  
  const anonymousLoginAs = useCallback(async (userToLoginAs: UserInfo) => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
        await signInAnonymously(auth);
        setAnonymousProfile(userToLoginAs); // Directly set the profile in state
        router.push("/dashboard");

    } catch (err: any) {
        console.error("Anonymous login failed:", err);
        setAuthError(err);
    } finally {
        setIsLoggingIn(false);
    }
  }, [auth, router]);

  const logout = useCallback(() => {
    signOut(auth).then(() => {
      setAnonymousProfile(null);
      router.push("/");
    });
  }, [auth, router]);

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      const currentRole = firebaseUser?.isAnonymous ? anonymousProfile?.role : userInfo?.role;
      if (!currentRole) return false;
      const rolesToCheck = Array.isArray(roles) ? roles : [roles];
      return rolesToCheck.includes(currentRole);
    },
    [userInfo?.role, firebaseUser?.isAnonymous, anonymousProfile?.role]
  );
  
  const finalUserInfo = useMemo(() => {
    if (firebaseUser?.isAnonymous && anonymousProfile) {
      return anonymousProfile;
    }
    return userInfo;
  }, [firebaseUser, anonymousProfile, userInfo]);

  const isUserLoading = isFirebaseUserLoading || (firebaseUser && !finalUserInfo);

  return {
    user: firebaseUser,
    auth,
    userInfo: finalUserInfo,
    isUserLoading,
    isLoggingIn,
    login,
    anonymousLoginAs,
    logout,
    hasRole,
    authError,
  };
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
