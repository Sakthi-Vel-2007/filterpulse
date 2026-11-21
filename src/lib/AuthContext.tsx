import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, authEnabled, googleProvider } from "./firebase";

interface AuthValue {
  user: User | null;
  loading: boolean;
  enabled: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue>({
  user: null,
  loading: false,
  enabled: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(authEnabled);

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value: AuthValue = {
    user,
    loading,
    enabled: authEnabled,
    signIn: async () => {
      if (auth) await signInWithPopup(auth, googleProvider);
    },
    signOut: async () => {
      if (auth) await fbSignOut(auth);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}