"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  signUpWithEmail,
} from "@/lib/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signUpWithEmail: typeof signUpWithEmail;
  signInWithEmail: typeof signInWithEmail;
  signInWithGoogle: typeof signInWithGoogle;
  signOut: typeof signOutUser;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, [configured]);

  const value = useMemo(
    () => ({
      user,
      loading,
      configured,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      signOut: signOutUser,
    }),
    [configured, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export function getUserLabel(user: User) {
  return user.displayName || user.email || "Signed in";
}
