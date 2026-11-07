"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DemoUser, UserPresenceStatus, DEMO_USERS } from "@/lib/auth-types";

export interface SignupPayload {
  email: string;
  password: string;
  role: "CLIENT" | "FREELANCER";
  name: string;
  preferences?: string[];
  skills?: string[];
  profileType?: string;
  workExperience?: string;
  title?: string;
}

interface AuthContextType {
  user: DemoUser | null;
  isLoading: boolean;
  presence: UserPresenceStatus;
  updatePresence: (status: UserPresenceStatus) => Promise<boolean>;
  updateAvatar: (avatarUrl: string) => Promise<boolean>;
  updateHiringStatus: (status: string) => Promise<boolean>;
  loginAs: (roleOrKey: "CLIENT" | "FREELANCER_A" | string) => Promise<boolean>;
  loginWithCredentials: (
    email: string,
    password?: string
  ) => Promise<{ success: boolean; error?: string; user?: DemoUser }>;
  signup: (payload: SignupPayload) => Promise<{ success: boolean; error?: string; user?: DemoUser }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [presence, setPresence] = useState<UserPresenceStatus>("available");

  // Synchronize presence with user data if session specifies one
  useEffect(() => {
    if (user?.presenceStatus) {
      setPresence(user.presenceStatus);
    }
  }, [user?.presenceStatus]);

  const updatePresence = useCallback(
    async (status: UserPresenceStatus): Promise<boolean> => {
      setPresence(status);
      setUser((prev) => (prev ? { ...prev, presenceStatus: status } : prev));
      try {
        const res = await fetch("/api/users/presence", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presence: status }),
        });
        if (!res.ok) {
          console.warn("Failed to persist presence to server");
          return false;
        }
        return true;
      } catch (err) {
        console.error("Error updating presence:", err);
        return false;
      }
    },
    []
  );

  const updateAvatar = useCallback(async (avatarUrl: string): Promise<boolean> => {
    // Optimistically set avatar for instant visual feedback
    setUser((prev) => (prev ? { ...prev, avatar: avatarUrl } : prev));
    try {
      const res = await fetch("/api/users/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: avatarUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        const savedUrl = data.avatarUrl || avatarUrl;
        setUser((prev) => {
          if (!prev) return prev;
          if (typeof window !== "undefined") {
            try {
              if (prev.id) localStorage.setItem(`nexum_user_avatar_${prev.id}`, savedUrl);
              if (prev.email) localStorage.setItem(`nexum_user_avatar_${prev.email}`, savedUrl);
            } catch {}
          }
          return { ...prev, avatar: savedUrl };
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error saving avatar:", err);
      return false;
    }
  }, []);

  const updateHiringStatus = useCallback(async (status: string): Promise<boolean> => {
    setUser((prev) => (prev ? { ...prev, statusBadge: status } : prev));
    try {
      const res = await fetch("/api/users/hiring-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch (err) {
      console.error("Error saving hiring status:", err);
      return false;
    }
  }, []);

  // Network offline/online listeners
  useEffect(() => {
    const handleOffline = () => {
      updatePresence("offline");
    };
    const handleOnline = () => {
      setPresence((current) => {
        if (current === "offline") {
          updatePresence("available");
          return "available";
        }
        return current;
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [updatePresence]);

  const restoreCachedAvatar = (u: DemoUser | null): DemoUser | null => {
    if (!u || typeof window === "undefined") return u;
    try {
      const cached =
        (u.id ? localStorage.getItem(`nexum_user_avatar_${u.id}`) : null) ||
        (u.email ? localStorage.getItem(`nexum_user_avatar_${u.email}`) : null);
      if (cached && cached.trim()) {
        return { ...u, avatar: cached };
      }
    } catch {}
    return u;
  };

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(restoreCachedAvatar(data.user || null));
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (isMounted) {
          setUser(restoreCachedAvatar(data.user || null));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to fetch session:", err);
          setUser(null);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const loginWithCredentials = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; error?: string; user?: DemoUser }> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err: unknown) {
      console.error("Login with credentials failed:", err);
      const msg = err instanceof Error ? err.message : "Network error during authentication";
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const loginAs = async (roleOrKey: "CLIENT" | "FREELANCER_A" | string): Promise<boolean> => {
    setIsLoading(true);
    try {
      let targetEmail = "";
      if (roleOrKey === "CLIENT") targetEmail = DEMO_USERS.CLIENT.email;
      else if (roleOrKey === "FREELANCER_A" || roleOrKey === "FREELANCER") targetEmail = DEMO_USERS.FREELANCER_A.email;
      else if (DEMO_USERS[roleOrKey]) targetEmail = DEMO_USERS[roleOrKey].email;

      if (!targetEmail) {
        console.warn(`[AuthContext] Unknown demo role or persona: ${roleOrKey}`);
        return false;
      }

      const result = await loginWithCredentials(targetEmail, "demo1234");
      return result.success;
    } catch (err) {
      console.error("Login failed:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    payload: SignupPayload
  ): Promise<{ success: boolean; error?: string; user?: DemoUser }> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err: unknown) {
      console.error("Signup failed:", err);
      const msg = err instanceof Error ? err.message : "Network error during registration";
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        presence,
        updatePresence,
        updateAvatar,
        updateHiringStatus,
        loginAs,
        loginWithCredentials,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
