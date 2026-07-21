import type { UserRole } from "@/types/user";
import type {
  PermissionKey,
  PermissionMatrix,
  ResourceName,
} from "@/types/permission";
import { RESOURCE_PERMISSIONS } from "@/types/permission";

const PERMISSIONS_STORAGE_KEY = "taskManagerPermissions";

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = {
  admin: {
    "tasks.view": true,
    "tasks.create": true,
    "tasks.edit": true,
    "tasks.delete": true,
    "team.view": true,
    "team.edit": true,
    "teamTask.view": true,
    "users.view": true,
    "users.edit": true,
    "resources.view": true,
    "resources.manage": true,
  },
  lead: {
    "tasks.view": true,
    "tasks.create": true,
    "tasks.edit": true,
    "tasks.delete": false,
    "team.view": true,
    "team.edit": false,
    "teamTask.view": true,
    "users.view": false,
    "users.edit": false,
    "resources.view": true,
    "resources.manage": false,
  },
  employee: {
    "tasks.view": true,
    "tasks.create": true,
    "tasks.edit": false,
    "tasks.delete": false,
    "team.view": true,
    "team.edit": false,
    "teamTask.view": false,
    "users.view": false,
    "users.edit": false,
    "resources.view": true,
    "resources.manage": false,
  },
};

function loadFromStorage(): PermissionMatrix {
  if (typeof window === "undefined") return DEFAULT_PERMISSION_MATRIX;
  try {
    const raw = window.localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_PERMISSION_MATRIX;
    const parsed = JSON.parse(raw) as PermissionMatrix;
    return {
      admin: { ...DEFAULT_PERMISSION_MATRIX.admin, ...parsed.admin },
      lead: { ...DEFAULT_PERMISSION_MATRIX.lead, ...parsed.lead },
      employee: { ...DEFAULT_PERMISSION_MATRIX.employee, ...parsed.employee },
    };
  } catch {
    return DEFAULT_PERMISSION_MATRIX;
  }
}

export function getStoredPermissions(): PermissionMatrix {
  return loadFromStorage();
}

export function saveStoredPermissions(matrix: PermissionMatrix) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(matrix));
}

export function hasPermission(
  role: UserRole | undefined,
  permission: PermissionKey,
): boolean {
  if (!role) return false;
  const matrix = loadFromStorage();
  return Boolean(matrix[role]?.[permission]);
}

export function getRolePermissions(role: UserRole | undefined) {
  if (!role) return {} as Record<PermissionKey, boolean>;
  const matrix = loadFromStorage();
  return matrix[role] || {};
}

export function hasResourcePermission(
  role: UserRole | undefined,
  resource: ResourceName,
) {
  if (!role) return false;
  const matrix = loadFromStorage();
  const permissions = matrix[role] || {};
  return RESOURCE_PERMISSIONS.some(
    (permission) =>
      permission.resource === resource && Boolean(permissions[permission.key]),
  );
}

export function getPermissionDefinitions() {
  return RESOURCE_PERMISSIONS;
}

export function getPermissionLabel(key: PermissionKey) {
  return RESOURCE_PERMISSIONS.find((item) => item.key === key)?.label ?? key;
}
