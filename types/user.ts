export type UserRole = "admin" | "lead" | "employee";

export interface User {
  id: number;
  name: string;
  email: string;
  role?: UserRole;
  status?: "active" | "inactive";
  isActive?: boolean;
  password?: string;
}
