import type { UserRole } from "./user";

export type ResourceName =
  | "tasks"
  | "team"
  | "teamTask"
  | "users"
  | "resources";
export type PermissionAction = "view" | "create" | "edit" | "delete" | "manage";
export type PermissionKey = `${ResourceName}.${PermissionAction}`;

export type PermissionSet = Record<PermissionKey, boolean>;
export type PermissionMatrix = Record<UserRole, PermissionSet>;

export type PermissionDefinition = {
  key: PermissionKey;
  label: string;
  resource: ResourceName;
  action: PermissionAction;
};

export const RESOURCE_PERMISSIONS: PermissionDefinition[] = [
  { key: "tasks.view", label: "Lihat Task", resource: "tasks", action: "view" },
  {
    key: "tasks.create",
    label: "Buat Task",
    resource: "tasks",
    action: "create",
  },
  { key: "tasks.edit", label: "Edit Task", resource: "tasks", action: "edit" },
  {
    key: "tasks.delete",
    label: "Hapus Task",
    resource: "tasks",
    action: "delete",
  },
  { key: "team.view", label: "Lihat Team", resource: "team", action: "view" },
  { key: "team.edit", label: "Kelola Team", resource: "team", action: "edit" },
  {
    key: "teamTask.view",
    label: "Lihat Team Task",
    resource: "teamTask",
    action: "view",
  },
  {
    key: "users.view",
    label: "Lihat User Management",
    resource: "users",
    action: "view",
  },
  {
    key: "users.edit",
    label: "Kelola User",
    resource: "users",
    action: "edit",
  },
  {
    key: "resources.view",
    label: "Lihat Resources",
    resource: "resources",
    action: "view",
  },
  {
    key: "resources.manage",
    label: "Kelola Permission Matrix",
    resource: "resources",
    action: "manage",
  },
];

export const RESOURCE_LABELS: Record<ResourceName, string> = {
  tasks: "Tasks",
  team: "Team",
  teamTask: "Team Task",
  users: "User Management",
  resources: "Resources",
};
