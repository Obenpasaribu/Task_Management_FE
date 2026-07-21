"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  getStoredUsers,
  saveStoredUsers,
  isValidUserRole,
} from "@/lib/mockData";
import type { User } from "@/types/user";

export function useUsers() {
  const [users, setUsers] = useState<User[]>(() => {
    if (typeof window === "undefined") return [];
    return getStoredUsers();
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);

      const storedUsers = getStoredUsers();
      if (storedUsers.length > 0) {
        setUsers(storedUsers);
      }

      try {
        const { data } = await api.get<User[]>("/api/v1/users");
        const fallbackUsers = getStoredUsers();
        const normalized = data.map((user) => {
          const preservedRole = isValidUserRole(user.role)
            ? user.role
            : fallbackUsers.find(
                (localUser) =>
                  localUser.email?.toLowerCase() === user.email?.toLowerCase(),
              )?.role;
          return {
            ...user,
            role: preservedRole,
          };
        });
        setUsers(normalized);
        saveStoredUsers(normalized);
      } catch (err: any) {
        if (storedUsers.length === 0) {
          const fallbackUsers = getStoredUsers();
          setUsers(fallbackUsers);
          if (fallbackUsers.length === 0) {
            setError(
              err?.response?.data?.message || "Gagal mengambil data user",
            );
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, isLoading, error };
}
