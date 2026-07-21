"use client";

import { useEffect, useState } from "react";
import AssigneeDropdown from "@/components/AssigneeDropdown";
import type { Task, TaskStatus } from "@/types/task";
import type { User } from "@/types/user";

type Props = {
  initialValue?: Task;
  users: User[];
  onSubmit: (payload: Partial<Task>) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
};

const emptyForm = {
  title: "",
  description: "",
  status: "todo" as TaskStatus,
  deadline: "",
  assignee_id: undefined as number | undefined,
};

export default function TaskForm({
  initialValue,
  users,
  onSubmit,
  isSubmitting,
  submitLabel = "Simpan",
}: Props) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialValue) {
      setForm({
        title: initialValue.title ?? "",
        description: initialValue.description ?? "",
        status: initialValue.status ?? "todo",
        deadline: initialValue.deadline
          ? initialValue.deadline.slice(0, 10)
          : "",
        assignee_id: initialValue.assignee_id,
      });
    }
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Judul task wajib diisi");
      return;
    }
    setError("");
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      deadline: form.deadline || undefined,
      assignee_id: form.assignee_id,
    });
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div>
        <label className="mb-1 block text-sm font-medium">Judul</label>
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Deskripsi</label>
        <textarea
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Status</label>
        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value as TaskStatus })
          }
        >
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Deadline</label>
        <input
          type="date"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Assignee</label>
        <AssigneeDropdown
          value={form.assignee_id}
          users={users}
          onChange={(value) => setForm({ ...form, assignee_id: value })}
        />
      </div>

      <button
        className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Menyimpan..." : submitLabel}
      </button>
    </form>
  );
}
