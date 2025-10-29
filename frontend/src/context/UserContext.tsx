"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type User = {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
};

type UserContextType = {
  user: User | null;
  token: string | null;
  setAuthState: (user: User | null, token: string | null) => void;
  clearAuthState: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const setAuthState = useCallback((nextUser: User | null, nextToken: string | null) => {
    setUser(nextUser);
    setToken(nextToken);
  }, []);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      setAuthState,
      clearAuthState,
    }),
    [user, token, setAuthState, clearAuthState],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
