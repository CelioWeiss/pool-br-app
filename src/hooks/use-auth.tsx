
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
  signInAnonymously,
} from "firebase/auth";
import {
  doc,
  collection,
  query,
  where,
  limit,
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
  }, [firestore, baseUserInfo]);

  const {
    data: clientDocs,
    isLoading: isClientLoading,
  } = useCollection<Client>(clientQuery);

  const userInfo = useMemo(() => {
    if (!baseUserInfo) return null;

    if (baseUserInfo.role !== "client" || !clientDocs) return baseUserInfo;

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
        // Sign in anonymously to get a temporary Firebase user
        const { user } = await signInAnonymously(auth);

        // Here, instead of creating a real doc, we simulate having the doc
        // by directly controlling the state and redirecting.
        // In a real scenario, you might link the anonymous UID to a profile.
        
        // This is a mock-up of what the user info would look like
        const simulatedUserInfo: UserInfo = {
            ...userToLoginAs,
            id: user.uid // Use the anonymous user's UID
        };

        // For this demo, we'll assume the onAuthStateChanged listener and
        // the useDoc hook will eventually pick up a "real" user document.
        // The key is to redirect after a successful login.
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

  return {
    user: firebaseUser,
    auth,
    userInfo,
    isUserLoading:
      isFirebaseUserLoading ||
      isUserInfoLoading ||
      isClientLoading,
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
