"use client";

import { useEffect, useMemo, useState } from "react";
import type { PermissionMatrix, PermissionKey } from "@/types/permission";
import {
  DEFAULT_PERMISSION_MATRIX,
  getStoredPermissions,
  saveStoredPermissions,
} from "@/lib/permissions";

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionMatrix>(
    DEFAULT_PERMISSION_MATRIX,
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = getStoredPermissions();
    setPermissions(stored);
    setIsReady(true);
  }, []);

  const updatePermission = (
    role: keyof PermissionMatrix,
    key: PermissionKey,
    value: boolean,
  ) => {
    setPermissions((current) => {
      const next = {
        ...current,
        [role]: {
          ...current[role],
          [key]: value,
        },
      };
      saveStoredPermissions(next);
      return next;
    });
  };

  const savePermissionMatrix = (matrix: PermissionMatrix) => {
    const next = JSON.parse(JSON.stringify(matrix)) as PermissionMatrix;
    saveStoredPermissions(next);
    setPermissions(next);
  };

  const rolePermissionKeys = useMemo(() => {
    return Object.keys(permissions) as Array<keyof PermissionMatrix>;
  }, [permissions]);

  return {
    permissions,
    isReady,
    rolePermissionKeys,
    updatePermission,
    savePermissionMatrix,
  };
}
