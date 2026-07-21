"use client";

import { useMemo } from "react";
import { useUser } from "@/context/UserContext";
import { hasPermission } from "@/lib/permissions";
import type { PermissionKey } from "@/types/permission";

type PermissionGuardProps = {
  permission: PermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function PermissionGuard({
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { user } = useUser();
  const allowed = useMemo(
    () => hasPermission(user?.role, permission),
    [user?.role, permission],
  );

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
