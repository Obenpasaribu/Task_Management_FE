"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getToken,
  setToken as persistToken,
  removeToken as clearToken,
} from "@/lib/auth";

type AuthContextType = {
  token: string | null;
  setToken: (token: string | null) => void;
  isReady: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialToken = getToken();
    if (initialToken) {
      setTokenState(initialToken);
    }
    setIsReady(true);
  }, []);

  const setToken = (nextToken: string | null) => {
    setTokenState(nextToken);
    if (nextToken) {
      persistToken(nextToken);
    } else {
      clearToken();
    }
  };

  const value = useMemo(
    () => ({
      token,
      setToken,
      isReady,
    }),
    [token, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
