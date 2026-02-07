"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { ApiError } from "@/api/apiClient";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  type LoginRequest,
} from "@/api/authApi";

export type User = {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
};

type UserContextType = {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<User | null>;
  login: (payload: LoginRequest) => Promise<User>;
  logout: () => Promise<void>;
  clearAuthState: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const currentUser = await getCurrentUser();
      const nextUser: User = {
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        avatarUrl: currentUser.avatarUrl,
      };
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        return null;
      }

      throw error;
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [refreshUser]);

  const login = useCallback(
    async (payload: LoginRequest): Promise<User> => {
      await loginRequest(payload);
      const currentUser = await refreshUser();
      if (!currentUser) {
        throw new Error("Unable to load user profile after login");
      }
      return currentUser;
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }, []);

  const clearAuthState = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshUser,
      login,
      logout,
      clearAuthState,
    }),
    [user, loading, refreshUser, login, logout, clearAuthState],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  // fetches the context by UserContextType, if the context is not found, it throws an error
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
