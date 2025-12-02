
"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import type { Client, UserInfo, UserRole } from "@/lib/types";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import {
  getAuth,
  signOut,
  signInWithEmailAndPassword,
  AuthError,
  User as FirebaseUser,
  Auth,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  limit,
  writeBatch,
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

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  const userDocRef = useMemo(() => {
    if (!firestore || !firebaseUser?.uid) return null;
    return doc(firestore, "users", firebaseUser.uid);
  }, [firestore, firebaseUser?.uid]);

  const {
    data: baseUserInfo,
    isLoading: isUserInfoLoading,
  } = useDoc<UserInfo>(userDocRef);

  const clientQuery = useMemo(() => {
    if (
      firestore &&
      baseUserInfo?.role === "client" &&
      baseUserInfo.franchiseId &&
      baseUserInfo.id
    ) {
      return query(
        collection(
          firestore,
          "franchises",
          baseUserInfo.franchiseId,
          "clients"
        ),
        where("userId", "==", baseUserInfo.id),
        limit(1)
      );
    }
    return null;
  }, [
    firestore,
    baseUserInfo?.id,
    baseUserInfo?.role,
    baseUserInfo?.franchiseId,
  ]);

  const {
    data: clientDocs,
    isLoading: isClientLoading,
  } = useCollection<Client>(clientQuery);

  const userInfo = useMemo(() => {
    if (!baseUserInfo) return null;

    if (baseUserInfo.role !== "client") return baseUserInfo;

    const clientProfile = clientDocs?.[0];
    if (!clientProfile) return baseUserInfo;

    return {
      ...baseUserInfo,
      firstName: clientProfile.contactName || baseUserInfo.firstName,
      lastName: "",
      avatarUrl: clientProfile.avatarUrl || baseUserInfo.avatarUrl,
    };
  }, [baseUserInfo, clientDocs]);

  const login = useCallback(
    async (
      email: string,
      pass: string
    ): Promise<{ ok: boolean; error?: string; redirect?: string }> => {
      setIsLoggingIn(true);
      setAuthError(null);

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const loggedInUser = userCredential.user;

        // The onAuthStateChanged listener will handle the user state update.
        // We just redirect.
        
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
    [auth, firestore]
  );

  const logout = useCallback(() => {
    signOut(auth).then(() => {
      router.push("/");
    });
  }, [auth, router]);

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      if (!userInfo?.role) return false;
      const rolesToCheck = Array.isArray(roles) ? roles : [roles];
      return rolesToCheck.includes(userInfo.role);
    },
    [userInfo?.role]
  );

  return useMemo(
    () => ({
      user: firebaseUser,
      auth,
      userInfo,
      isUserLoading:
        isFirebaseUserLoading ||
        isUserInfoLoading ||
        isClientLoading,
      isLoggingIn,
      login,
      logout,
      hasRole,
      authError,
    }),
    [
      firebaseUser,
      auth,
      userInfo,
      isFirebaseUserLoading,
      isUserInfoLoading,
      isClientLoading,
      isLoggingIn,
      login,
      logout,
      hasRole,
      authError,
    ]
  );
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
