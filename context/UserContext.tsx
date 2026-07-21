"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@/types/user";

type UserContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  isReady: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedUser = window.localStorage.getItem("taskManagerUser");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as User;
        setUserState({
          ...parsed,
          id:
            typeof parsed.id === "string" ? parseInt(parsed.id, 10) : parsed.id,
        });
      } catch {
        setUserState(null);
      }
    }
    setIsReady(true);
  }, []);

  const normalizeUser = (value: User): User => ({
    ...value,
    id: typeof value.id === "string" ? parseInt(value.id, 10) : value.id,
  });

  const setUser = (value: User | null) => {
    const normalizedUser = value ? normalizeUser(value) : null;
    setUserState(normalizedUser);
  };

  useEffect(() => {
    // Initialize default data if not exists
    if (typeof window !== "undefined") {
      const usersKey = "taskManagerUsers";
      const teamsKey = "taskManagerTeams";

      // Check if data exists in localStorage
      const hasUsers = window.localStorage.getItem(usersKey);
      const hasTeams = window.localStorage.getItem(teamsKey);

      // If no data, initialize with defaults
      if (!hasUsers || !hasTeams) {
        if (!hasUsers) {
          const defaultUsers = [
            {
              id: 1,
              name: "Admin Utama",
              email: "admin@example.com",
              role: "admin",
              status: "active",
              isActive: true,
            },
            {
              id: 2,
              name: "Lead Tim A",
              email: "lead@example.com",
              role: "lead",
              status: "active",
              isActive: true,
            },
            {
              id: 3,
              name: "Employee Satu",
              email: "employee1@example.com",
              role: "employee",
              status: "active",
              isActive: true,
            },
            {
              id: 4,
              name: "Employee Dua",
              email: "employee2@example.com",
              role: "employee",
              status: "active",
              isActive: true,
            },
          ];
          window.localStorage.setItem(usersKey, JSON.stringify(defaultUsers));
        }

        if (!hasTeams) {
          const defaultTeams = [
            {
              id: 1,
              name: "Tim A",
              description: "Tim produksi utama",
              leadId: 2,
              memberIds: [3, 4],
            },
          ];
          window.localStorage.setItem(teamsKey, JSON.stringify(defaultTeams));
        }
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      window.localStorage.setItem("taskManagerUser", JSON.stringify(user));
    } else {
      window.localStorage.removeItem("taskManagerUser");
    }
  }, [user]);

  const value = useMemo(() => ({ user, setUser, isReady }), [user, isReady]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
}
