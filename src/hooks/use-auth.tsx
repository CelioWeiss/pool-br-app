
"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
  useEffect,
  useRef,
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
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
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

  const isCreatingUserRef = useRef(false);

  // ✅ userDocRef ESTÁVEL
  const userDocRef = useMemo(() => {
    if (!firestore || !firebaseUser?.uid) return null;
    return doc(firestore, "users", firebaseUser.uid);
  }, [firestore, firebaseUser?.uid]);

  const {
    data: baseUserInfo,
    isLoading: isUserInfoLoading,
  } = useDoc<UserInfo>(userDocRef);

  // ✅ clientQuery TOTALMENTE ESTÁVEL
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

  // ✅ userInfo BLINDADO CONTRA LOOP
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
  }, [baseUserInfo?.id, baseUserInfo?.role, clientDocs?.[0]?.id]);

  // ✅ LOGIN SEGURO
  const login = useCallback(
    async (
      email: string,
      pass: string
    ): Promise<{ ok: boolean; error?: string; redirect?: string }> => {
      setIsLoggingIn(true);
      setAuthError(null);

      try {
        // Reset user creation flag on new login attempt
        isCreatingUserRef.current = false;

        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const loggedInUser = userCredential.user;

        // Perform user profile check/creation after successful login
        if (firestore && loggedInUser) {
            const userRef = doc(firestore, "users", loggedInUser.uid);
            const docSnap = await getDoc(userRef);

            if (!docSnap.exists()) {
                const userEmail = loggedInUser.email || "";
                const nameParts =
                    loggedInUser.displayName?.split(" ") || [
                        userEmail.split("@")[0],
                        "",
                    ];
                const isMaster = userEmail === "master@poolbr.com";

                const newUserInfo: UserInfo = {
                    id: loggedInUser.uid,
                    firstName: nameParts[0],
                    lastName: nameParts.slice(1).join(" "),
                    email: userEmail,
                    role: isMaster ? "master" : "owner",
                    franchiseId: null,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                };
                await setDoc(userRef, newUserInfo);
            }
        }
        
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

  // ✅ LOGOUT SEGURO
  const logout = useCallback(() => {
    signOut(auth).then(() => {
      isCreatingUserRef.current = false;
      router.push("/");
    });
  }, [auth, router]);

  // ✅ hasRole PERFEITO E ESTÁVEL
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
