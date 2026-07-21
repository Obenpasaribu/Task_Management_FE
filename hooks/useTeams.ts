"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
  createTeam as createLocalTeam,
  deleteTeam as deleteLocalTeam,
  getStoredTeams,
  saveStoredTeams,
  updateTeam as updateLocalTeam,
} from "@/lib/mockData";
import type { Team } from "@/types/team";

const normalizeTeam = (team: any): Team => {
  const rawLeadId =
    team.lead_id ?? team.leadId ?? team.lead?.id ?? team.lead?.user_id;
  const rawMembers = team.member_ids ?? team.memberIds ?? team.members ?? [];
  const memberIds = Array.isArray(rawMembers)
    ? rawMembers.map((item) =>
        typeof item === "object" && item !== null
          ? Number(item.id ?? item.user_id ?? item.member_id)
          : Number(item),
      )
    : [];

  return {
    id: Number(team.id),
    name: team.name,
    description: team.description,
    leadId: Number(rawLeadId),
    memberIds: memberIds.filter((value) => !Number.isNaN(value)),
  };
};

type UseTeamsOptions = {
  path?: string;
};

export function useTeams({ path = "/api/v1/teams" }: UseTeamsOptions = {}) {
  const { token, isReady } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!isReady || !token) return;
    setIsLoading(true);
    setError(null);
    setStatus(null);

    try {
      const { data } = await api.get<any[]>(path);
      const normalized = data.map(normalizeTeam);
      setTeams(normalized);
      saveStoredTeams(normalized);
    } catch (err: any) {
      const storedTeams = getStoredTeams();
      setTeams(storedTeams);
      const responseStatus = err?.response?.status;
      setStatus(responseStatus ?? null);
      if (storedTeams.length === 0) {
        setError(err?.response?.data?.message || "Gagal mengambil data tim");
      }
    } finally {
      setIsLoading(false);
    }
  }, [path, isReady, token]);

  const createTeam = useCallback(async (team: Omit<Team, "id">) => {
    const payload = {
      name: team.name,
      description: team.description,
      lead_id: team.leadId,
      member_ids: team.memberIds,
    };

    try {
      const { data } = await api.post<any>("/api/v1/teams", payload);
      const normalized = normalizeTeam(data);
      setTeams((previous) => {
        const next = [normalized, ...previous];
        saveStoredTeams(next);
        return next;
      });
      return normalized;
    } catch {
      const fallback = createLocalTeam(team);
      setTeams((previous) => {
        const next = [fallback, ...previous];
        saveStoredTeams(next);
        return next;
      });
      return fallback;
    }
  }, []);

  const updateTeam = useCallback(async (id: number, updates: Partial<Team>) => {
    const payload = {
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.description ? { description: updates.description } : {}),
      ...(typeof updates.leadId === "number"
        ? { lead_id: updates.leadId }
        : {}),
      ...(Array.isArray(updates.memberIds)
        ? { member_ids: updates.memberIds }
        : {}),
    };

    try {
      const { data } = await api.put<any>(`/api/v1/teams/${id}`, payload);
      const normalized = normalizeTeam(data);
      setTeams((previous) => {
        const next = previous.map((team) =>
          team.id === id ? normalized : team,
        );
        saveStoredTeams(next);
        return next;
      });
      return normalized;
    } catch (err: any) {
      const responseStatus = err?.response?.status;
      const responseData = err?.response?.data;
      // If backend returned a client error (4xx), surface it to caller
      if (responseStatus && responseStatus >= 400 && responseStatus < 500) {
        setStatus(responseStatus);
        setError(
          responseData?.message ||
            responseData?.error ||
            "Gagal memperbarui tim",
        );
        throw err;
      }

      // Otherwise fallback to local mock update
      const updated = updateLocalTeam(id, {
        ...updates,
        id,
      });
      if (updated) {
        setTeams((previous) => {
          const next = previous.map((team) =>
            team.id === id ? updated : team,
          );
          saveStoredTeams(next);
          return next;
        });
      }
      return updated;
    }
  }, []);

  const deleteTeam = useCallback(async (id: number) => {
    try {
      await api.delete(`/api/v1/teams/${id}`);
      setTeams((previous) => {
        const next = previous.filter((team) => team.id !== id);
        saveStoredTeams(next);
        return next;
      });
      return true;
    } catch {
      const success = deleteLocalTeam(id);
      if (success) {
        setTeams((previous) => {
          const next = previous.filter((team) => team.id !== id);
          saveStoredTeams(next);
          return next;
        });
      }
      return success;
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return {
    teams,
    isLoading,
    error,
    status,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
  };
}
