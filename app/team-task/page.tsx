"use client";

import { useMemo, useState } from "react";
import { useUser } from "@/context/UserContext";
import { hasPermission } from "@/lib/permissions";
import { useTasks } from "@/hooks/useTasks";
import { useTeams } from "@/hooks/useTeams";
import { useUsers } from "@/hooks/useUsers";
import type { Task, TaskStatus } from "@/types/task";
import type { Team } from "@/types/team";
import type { User } from "@/types/user";

export default function TeamTaskPage() {
  const { user } = useUser();
  const { tasks, isLoading, error } = useTasks();
  const { teams } = useTeams();
  const { users } = useUsers();

  const currentTeam = useMemo(() => {
    if (!user?.id || teams.length === 0) return null;
    const currentUserId = Number(user.id);
    return (
      teams.find(
        (team) =>
          team.leadId === currentUserId ||
          team.memberIds.includes(currentUserId),
      ) || null
    );
  }, [teams, user?.id]);

  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");

  const visibleTasks = useMemo(() => {
    if (!currentTeam) return [];
    const relevantIds = [currentTeam.leadId, ...currentTeam.memberIds];

    return tasks.filter(
      (task) =>
        relevantIds.includes(task.created_by ?? -1) ||
        relevantIds.includes(task.assignee_id ?? -1),
    );
  }, [currentTeam, tasks]);

  const filteredTasks = useMemo(() => {
    if (statusFilter === "all") return visibleTasks;
    return visibleTasks.filter((task) => task.status === statusFilter);
  }, [statusFilter, visibleTasks]);

  if (!hasPermission(user?.role, "teamTask.view")) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-slate-600">
            Anda tidak memiliki izin untuk melihat halaman Team Task.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Team Task</h1>
          <p className="mt-2 text-sm text-slate-600">
            {currentTeam
              ? `Lihat semua task yang terkait dengan tim ${currentTeam.name}.`
              : "Lihat task team Anda."}
          </p>
        </div>

        {currentTeam ? (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-700">
              Filter status task untuk tim Anda.
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">
                Status:
              </label>
              <select
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | TaskStatus)
                }
              >
                <option value="all">Semua</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Memuat task...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            Belum ada task yang cocok dengan filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{task.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {task.description || "-"}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase text-slate-700">
                    {task.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                  <span>
                    Deadline:{" "}
                    {task.deadline
                      ? new Date(task.deadline).toLocaleDateString("id-ID")
                      : "-"}
                  </span>
                  <span>
                    Assignee:{" "}
                    {task.assignee_id
                      ? users.find((item) => item.id === task.assignee_id)
                          ?.name || "-"
                      : "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
