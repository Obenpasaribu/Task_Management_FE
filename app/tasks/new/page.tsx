"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TaskForm from "@/components/TaskForm";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";
import { useTasks } from "@/hooks/useTasks";
import { useUsers } from "@/hooks/useUsers";
import { useUser } from "@/context/UserContext";
import type { Task } from "@/types/task";

export default function NewTaskPage() {
  const router = useRouter();
  const { token, isReady } = useAuth();
  const { user } = useUser();
  const { createTask } = useTasks();
  const { users } = useUsers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isReady && !token) {
      router.replace("/login");
    }
  }, [router, token, isReady]);

  const canCreateTask = hasPermission(user?.role, "tasks.create");

  if (!isReady || !token) {
    return null;
  }

  if (!canCreateTask) {
    // fallback if no user or permission
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-slate-600">
            Anda tidak memiliki izin untuk menambahkan task.
          </p>
        </div>
      </main>
    );
  }

  const handleSubmit = async (payload: Partial<Task>) => {
    setError("");
    setIsSubmitting(true);
    try {
      await createTask(payload);
      router.push("/tasks");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal menambahkan task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Tambah Task</h1>
        <p className="mt-2 text-sm text-slate-600">
          Isi form untuk menambahkan task baru.
        </p>
        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <TaskForm
          users={users}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </main>
  );
}
