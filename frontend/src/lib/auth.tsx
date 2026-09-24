"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { UserProfileRead } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface AuthContextType {
  user: UserProfileRead | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  demoLogin: (demoUserId: string, username: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  demoLogin: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfileRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("nexora_token") : null;
    if (!savedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BASE}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });
      if (res.ok) {
        const u = await res.json();
        setUser(u);
        setToken(savedToken);
        localStorage.setItem("nexora_user", JSON.stringify(u));
      } else {
        // If expired or invalid
        localStorage.removeItem("nexora_token");
        localStorage.removeItem("nexora_user");
        setToken(null);
        setUser(null);
      }
    } catch {
      // Offline / network fallback: use cached user if available
      const cached = localStorage.getItem("nexora_user");
      if (cached) {
        try {
          setUser(JSON.parse(cached));
          setToken(savedToken);
        } catch {
          // ignore
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    const handleAuthChange = () => {
      refreshUser();
    };

    window.addEventListener("auth_state_changed", handleAuthChange);
    return () => {
      window.removeEventListener("auth_state_changed", handleAuthChange);
    };
  }, [refreshUser]);

  const login = async (usernameOrEmail: string, password: string) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username_or_email: usernameOrEmail, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Invalid login credentials");
    }

    const data = await res.json();
    localStorage.setItem("nexora_token", data.access_token);
    localStorage.setItem("nexora_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    window.dispatchEvent(new Event("auth_state_changed"));
    window.dispatchEvent(new Event("notifications_updated"));
  };

  const register = async (payload: any) => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Registration failed" }));
      throw new Error(err.detail || "Registration failed");
    }

    const data = await res.json();
    localStorage.setItem("nexora_token", data.access_token);
    localStorage.setItem("nexora_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    window.dispatchEvent(new Event("auth_state_changed"));
    window.dispatchEvent(new Event("notifications_updated"));
  };

  const demoLogin = async (demoUserId: string, username: string) => {
    // Quick demo login uses password123 or direct user token
    try {
      await login(username, "password123");
    } catch {
      // Fallback to demo token if needed
      localStorage.setItem("nexora_token", demoUserId);
      setToken(demoUserId);
      await refreshUser();
      window.dispatchEvent(new Event("auth_state_changed"));
    }
  };

  const logout = () => {
    localStorage.removeItem("nexora_token");
    localStorage.removeItem("nexora_user");
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event("auth_state_changed"));
    window.dispatchEvent(new Event("notifications_updated"));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        demoLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
