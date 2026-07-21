import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import type { Task } from "@/types/task";

type Props = {
  task: Task;
  onDelete: (task: Task) => void;
};

export default function TaskCard({ task, onDelete }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{task.title}</h3>
        <StatusBadge status={task.status} />
      </div>
      {task.description ? (
        <p className="mt-2 text-sm text-slate-600">{task.description}</p>
      ) : null}
      <div className="mt-4 flex gap-3 text-sm">
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
          Hapus
        </button>
      </div>
    </div>
  );
}
