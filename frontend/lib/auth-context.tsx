"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authApi } from "./api";
import type { User } from "./types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await authApi.getUser();
      setUser(response.data);
    } catch {
      localStorage.removeItem("auth_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    localStorage.setItem("auth_token", response.data.token);
    setUser(response.data.user);
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ) => {
    const response = await authApi.register({
      name,
      email,
      password,
      password_confirmation: password,
    });
    localStorage.setItem("auth_token", response.data.token);
    setUser(response.data.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Token may already be invalid
    }
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
