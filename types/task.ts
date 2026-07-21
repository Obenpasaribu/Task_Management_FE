export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  deadline?: string;
  assignee_id?: number;
  created_by?: number;
}
