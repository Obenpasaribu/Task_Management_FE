"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import type { Task } from "@/types/task";

const normalizeDeadline = (deadline?: string) => {
  if (!deadline) return undefined;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(deadline)) {
    const [day, month, year] = deadline.split("/");
    return new Date(`${year}-${month}-${day}T00:00:00Z`).toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return `${deadline}T00:00:00Z`;
  }

  return deadline;
};

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Task[]>("/api/v1/tasks");
      setTasks(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal mengambil data task");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTask = async (payload: Partial<Task>) => {
    const normalizedPayload = {
      ...payload,
      deadline: normalizeDeadline(payload.deadline),
    };
    const { data } = await api.post<Task>("/api/v1/tasks", normalizedPayload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    setTasks((prev) => [data, ...prev]);
    return data;
  };

  const updateTask = async (id: number, payload: Partial<Task>) => {
    const normalizedPayload = {
      ...payload,
      deadline: normalizeDeadline(payload.deadline),
    };
    const { data } = await api.put<Task>(
      `/api/v1/tasks/${id}`,
      normalizedPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    setTasks((prev) => prev.map((task) => (task.id === id ? data : task)));
    return data;
  };

  const updateStatus = async (id: number, status: Task["status"]) => {
    const { data } = await api.patch<Task>(`/api/v1/tasks/${id}/status`, {
      status,
    });
    setTasks((prev) => prev.map((task) => (task.id === id ? data : task)));
    return data;
  };

  const deleteTask = async (id: number) => {
    await api.delete(`/api/v1/tasks/${id}`);
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    updateStatus,
    deleteTask,
  };
}
