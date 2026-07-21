"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TaskForm from "@/components/TaskForm";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";
import { useTasks } from "@/hooks/useTasks";
import { useUsers } from "@/hooks/useUsers";
import { useUser } from "@/context/UserContext";
import api from "@/lib/api";
import type { Task } from "@/types/task";

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const { token, isReady } = useAuth();
  const { user } = useUser();
  const { updateTask } = useTasks();
  const { users } = useUsers();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTask = async () => {
      if (!params.id) return;
      try {
        const { data } = await api.get<Task>(`/api/v1/tasks/${params.id}`);
        setTask(data);
      } catch {
        setError("Gagal memuat detail task");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [params.id]);

  useEffect(() => {
    if (isReady && !token) {
      router.replace("/login");
    }
  }, [router, token, isReady]);

  const canEditTask = hasPermission(user?.role, "tasks.edit");

  if (!isReady || !token) {
    return null;
  }

  if (!canEditTask) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-slate-600">
            Anda tidak memiliki izin untuk mengedit task.
          </p>
        </div>
      </main>
    );
  }

  const handleSubmit = async (payload: Partial<Task>) => {
    setError("");
    setIsSubmitting(true);
    try {
      await updateTask(Number(params.id), payload);
      router.push("/tasks");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal memperbarui task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Edit Task</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ubah data task yang dipilih.
        </p>
        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {!isLoading && task ? (
          <TaskForm
            initialValue={task}
            users={users}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Perbarui"
          />
        ) : (
          <p className="mt-4 text-sm text-slate-600">Memuat data task...</p>
        )}
      </div>
    </main>
  );
}
