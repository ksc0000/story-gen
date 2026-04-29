"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

const googleProvider = new GoogleAuthProvider();

import { isDemoMode } from "@/lib/demo";

const DEMO_USER = {
  uid: "demo-user-001",
  displayName: "デモユーザー",
  email: "demo@ehonai.local",
} as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          setUser(firebaseUser);
          setLoading(false);
        },
        () => {
          setLoading(false);
        }
      );
      return unsubscribe;
    } catch {
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = async () => {
    if (isDemoMode) {
      setUser(DEMO_USER);
      return;
    }

    const result = await signInWithPopup(auth, googleProvider);
    const userRef = doc(db, "users", result.user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        displayName: result.user.displayName ?? "",
        email: result.user.email ?? "",
        plan: "free",
        activeChildId: null,
        createdAt: serverTimestamp(),
        monthlyGenerationCount: 0,
      });
    }
  };

  const signOut = async () => {
    if (isDemoMode) {
      setUser(null);
      return;
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
