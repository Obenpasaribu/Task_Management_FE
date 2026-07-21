"use client";

import Link from "next/link";
import type { Task } from "@/types/task";
import type { User } from "@/types/user";

type Props = {
  tasks: Task[];
  users?: User[];
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: Task["status"]) => void;
  onDeleteConfirm?: number | null;
};

export default function TaskTable({
  tasks,
  users,
  onDelete,
  onStatusChange,
  onDeleteConfirm,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="px-4 py-3">Judul</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Assignee</th>
            <th className="px-4 py-3">Deadline</th>
            <th className="px-4 py-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-t border-slate-200">
              <td className="px-4 py-3">
                <div className="font-medium">{task.title}</div>
                {task.description ? (
                  <div className="text-xs text-slate-500">
                    {task.description}
                  </div>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <select
                  className="rounded-lg border border-slate-300 px-2 py-1"
                  value={task.status}
                  onChange={(e) =>
                    onStatusChange(task, e.target.value as Task["status"])
                  }
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </td>
              <td className="px-4 py-3">
                {users?.find((assignee) => assignee.id === task.assignee_id)
                  ? users.find((assignee) => assignee.id === task.assignee_id)
                      ?.name
                  : task.assignee_id
                    ? `User #${task.assignee_id}`
                    : "-"}
              </td>
              <td className="px-4 py-3">
                {task.deadline
                  ? new Date(task.deadline).toLocaleDateString("id-ID")
                  : "-"}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-3">
                  <Link
                    href={`/tasks/${task.id}/edit`}
                    className="text-slate-900 underline"
                  >
                    Edit
                  </Link>
                  <button
                    className="text-red-600 underline"
                    onClick={() => onDelete(task)}
                  >
                    {onDeleteConfirm === task.id ? "Konfirmasi" : "Hapus"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
