"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/context/UserContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  getPermissionDefinitions,
  getPermissionLabel,
  hasPermission,
} from "@/lib/permissions";
import { RESOURCE_LABELS } from "@/types/permission";
import type { PermissionKey, PermissionMatrix } from "@/types/permission";

export default function ResourcesPage() {
  const router = useRouter();
  const { token, isReady } = useAuth();
  const { user } = useUser();
  const {
    permissions,
    isReady: permissionsReady,
    rolePermissionKeys,
    updatePermission,
    savePermissionMatrix,
  } = usePermissions();

  useEffect(() => {
    if (isReady && !token) {
      router.replace("/login");
    }
  }, [isReady, router, token]);

  const canViewResources = hasPermission(user?.role, "resources.view");
  const canManageResources = hasPermission(user?.role, "resources.manage");

  const [activeTab, setActiveTab] = useState<
    "permissionMatrix" | "fiturResources" | "hakAksesSaya"
  >(canManageResources ? "permissionMatrix" : "fiturResources");
  const [stagedPermissions, setStagedPermissions] =
    useState<PermissionMatrix | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );

  const clonePermissions = (matrix: PermissionMatrix) =>
    JSON.parse(JSON.stringify(matrix)) as PermissionMatrix;

  const currentPermissions = useMemo(() => {
    if (!user?.role) return [];
    return getPermissionDefinitions().filter((permission) =>
      hasPermission(user.role, permission.key),
    );
  }, [user?.role]);

  useEffect(() => {
    if (permissionsReady) {
      setStagedPermissions(clonePermissions(permissions));
      setSaveStatus("idle");
    }
  }, [permissionsReady, permissions]);

  const hasChanges = useMemo(() => {
    if (!stagedPermissions) return false;
    return JSON.stringify(stagedPermissions) !== JSON.stringify(permissions);
  }, [permissions, stagedPermissions]);

  if (!isReady || !permissionsReady || !token || !stagedPermissions) {
    return null;
  }

  if (!canViewResources) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-slate-600">
            Anda tidak memiliki izin untuk mengakses resources.
          </p>
        </div>
      </main>
    );
  }

  const renderTabContent = () => {
    if (activeTab === "fiturResources") {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Fitur Resources</h2>
          <p className="mt-2 text-sm text-slate-600">
            Akses resources aplikasi dikelompokkan berdasarkan role dan
            permission.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(RESOURCE_LABELS).map(([resource, label]) => (
              <div
                key={resource}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Akses dikendalikan melalui permission matrix untuk setiap
                  role.
                </p>
              </div>
            ))}
          </div>
          {!canManageResources ? (
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
              Anda hanya memiliki izin baca untuk Resources. Anda tidak dapat
              mengubah Permission Matrix.
            </div>
          ) : null}
        </div>
      );
    }

    if (activeTab === "hakAksesSaya") {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Hak Akses Saya</h2>
          <p className="mt-2 text-sm text-slate-600">
            Daftar permission yang saat ini aktif untuk role Anda.
          </p>
          <div className="mt-4 grid gap-2">
            {currentPermissions.length > 0 ? (
              currentPermissions.map((permission) => (
                <div
                  key={permission.key}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                >
                  {getPermissionLabel(permission.key)}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">
                Tidak ada permission yang diberikan untuk role Anda.
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Permission Matrix</h2>
            <p className="mt-2 text-sm text-slate-600">
              Centang izin yang boleh dimiliki setiap role untuk masing-masing
              resource.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Role</th>
                  {getPermissionDefinitions().map((permission) => (
                    <th key={permission.key} className="px-4 py-3">
                      {permission.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rolePermissionKeys.map((role) => (
                  <tr key={role} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium capitalize">{role}</td>
                    {getPermissionDefinitions().map((permission) => {
                      const key = permission.key as PermissionKey;
                      return (
                        <td key={permission.key} className="px-4 py-3">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(stagedPermissions[role][key])}
                              onChange={
                                canManageResources
                                  ? (event) =>
                                      setStagedPermissions((current) => ({
                                        ...current!,
                                        [role]: {
                                          ...current![role],
                                          [key]: event.target.checked,
                                        },
                                      }))
                                  : undefined
                              }
                              disabled={!canManageResources}
                              className={`h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 ${
                                !canManageResources
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Resources</h1>
          <p className="mt-2 text-sm text-slate-600">
            Kelola hak akses fitur aplikasi berdasarkan role dengan permission
            matrix.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Menu Resources</h2>
              <p className="mt-1 text-sm text-slate-600">
                Pilih tab untuk melihat permission matrix, fitur resources, atau
                hak akses Anda.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("permissionMatrix")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeTab === "permissionMatrix"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Permission Matrix
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("fiturResources")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeTab === "fiturResources"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Fitur Resources
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("hakAksesSaya")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeTab === "hakAksesSaya"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Hak Akses Saya
              </button>
            </div>
          </div>

          <div className="mt-6">{renderTabContent()}</div>
          {canManageResources ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                {hasChanges
                  ? "Perubahan belum disimpan. Klik Simpan untuk memperbarui izin."
                  : "Tidak ada perubahan yang perlu disimpan."}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    savePermissionMatrix(stagedPermissions);
                    setSaveStatus("saved");
                  }}
                  disabled={!hasChanges}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    hasChanges
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  Simpan
                </button>
                {saveStatus === "saved" ? (
                  <span className="text-sm text-emerald-600">Tersimpan.</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
