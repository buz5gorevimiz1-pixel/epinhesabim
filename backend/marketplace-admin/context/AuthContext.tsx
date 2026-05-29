"use client";

import React, { createContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthState, User } from "@/types";
import { authApi } from "@/lib/api";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/lib/constants";
import { useToast } from "./ToastContext";

interface AuthContextType extends AuthState {
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
      return;
    }

    const result = await authApi.me();
    if (result.success && result.data) {
      setState({
        user: result.data,
        token,
        isLoading: false,
        isAuthenticated: true,
      });
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    const result = await authApi.login(identifier, password);
    if (result.success && result.data) {
      localStorage.setItem(ACCESS_TOKEN_KEY, result.data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, result.data.refreshToken);
      setState({
        user: result.data.user,
        token: result.data.accessToken,
        isLoading: false,
        isAuthenticated: true,
      });
      addToast("Giriş başarılı! Hoş geldiniz.", "success");
      router.push("/");
      return true;
    }
    addToast(result.error || "Giriş başarısız.", "error");
    return false;
  };

  const logout = async () => {
    await authApi.logout();
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
    addToast("Çıkış yapıldı.", "info");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
