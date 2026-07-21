"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TaskTable from "@/components/TaskTable";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/context/UserContext";
import { useTasks } from "@/hooks/useTasks";
import { useTeams } from "@/hooks/useTeams";
import { useUsers } from "@/hooks/useUsers";
import { hasPermission } from "@/lib/permissions";
import type { Task, TaskStatus } from "@/types/task";

export default function TasksPage() {
  const router = useRouter();
  const { token, isReady } = useAuth();
  const { user } = useUser();
  const { tasks, isLoading, error, updateStatus, deleteTask } = useTasks();
  const { teams } = useTeams();
  const { users } = useUsers();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.id - b.id),
    [tasks],
  );

  const displayTasks = useMemo(() => {
    const currentUserId = user ? Number(user.id) : null;
    const currentTeam = user
      ? teams.find(
          (team) =>
            currentUserId !== null &&
            (team.leadId === currentUserId ||
              team.memberIds.includes(currentUserId)),
        )
      : null;

    const currentTeamIds = currentTeam
      ? [currentTeam.leadId, ...currentTeam.memberIds]
      : [];

    const isTeamTask = (task: Task) =>
      currentTeam
        ? currentTeamIds.includes(task.created_by ?? -1) ||
          currentTeamIds.includes(task.assignee_id ?? -1)
        : false;

    return sortedTasks
      .filter((task) => {
        if (currentUserId === null) return false;
        const isPersonal =
          task.created_by === currentUserId ||
          task.assignee_id === currentUserId;
        if (!isPersonal) return false;

        const isSelfTask =
          task.created_by === currentUserId &&
          task.assignee_id === currentUserId;
        if (isSelfTask) return true;

        return !isTeamTask(task);
      })
      .filter((task) =>
        statusFilter === "all" ? true : task.status === statusFilter,
      );
  }, [sortedTasks, user, teams, statusFilter]);

  useEffect(() => {
    if (isReady && !token) {
      router.replace("/login");
    }
  }, [router, token, isReady]);

  if (!isReady || !token) {
    return null;
  }

  if (!hasPermission(user?.role, "tasks.view")) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-slate-600">
            Anda tidak memiliki izin untuk melihat halaman Task.
          </p>
        </div>
      </main>
    );
  }

  const handleDelete = async (task: Task) => {
    if (confirmDeleteId === task.id) {
      await deleteTask(task.id);
      setConfirmDeleteId(null);
      return;
    }
    setConfirmDeleteId(task.id);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Daftar Task</h1>
            <p className="text-sm text-slate-600">
              Kelola task Anda dari satu tempat.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <span>Status:</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as TaskStatus | "all")
                }
              >
                <option value="all">Semua</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </label>
            {hasPermission(user?.role, "tasks.create") ? (
              <Link
                href="/tasks/new"
                className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
              >
                + Tambah Task
              </Link>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-slate-600">Memuat task...</p>
        ) : (
          <TaskTable
            tasks={displayTasks}
            users={users}
            onDelete={handleDelete}
            onStatusChange={(task, status) => updateStatus(task.id, status)}
            onDeleteConfirm={confirmDeleteId}
          />
        )}
      </div>
    </main>
  );
}
