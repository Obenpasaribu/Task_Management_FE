"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/context/UserContext";
import {
  getRoleLabel,
  saveStoredUsers,
  createUser,
  getStoredUsers,
} from "@/lib/mockData";
import api from "@/lib/api";
import { useUsers } from "@/hooks/useUsers";
import type { User, UserRole } from "@/types/user";

export default function UserManagementPage() {
  const router = useRouter();
  const { token, isReady } = useAuth();
  const { user } = useUser();
  const { users: loadedUsers, isLoading } = useUsers();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 10;
  const defaultCreateForm: Partial<User> = { role: "employee" };
  const [form, setForm] = useState<Partial<User>>(defaultCreateForm);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (isReady && !token) {
      router.replace("/login");
    }
  }, [router, token, isReady]);

  useEffect(() => {
    if (loadedUsers.length > 0) {
      setUsers(loadedUsers);
      return;
    }

    if (!isLoading) {
      setUsers(getStoredUsers());
    }
  }, [loadedUsers, isLoading]);

  if (!isReady || !token) return null;
  if (!hasPermission(user?.role, "users.view")) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-slate-600">
            Anda tidak memiliki izin untuk mengakses halaman User Management.
          </p>
        </div>
      </main>
    );
  }

  if (user?.role !== "admin") {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-slate-600">
            Halaman ini hanya untuk role admin.
          </p>
        </div>
      </main>
    );
  }

  const openEdit = (target: User) => {
    setSelectedUser(target);
    setForm({
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
      isActive: target.isActive,
      password: "",
    });
  };

  const handleCreateUser = async () => {
    if (!form.name || !form.email || !form.role || !form.password) {
      alert("Mohon lengkapi semua field");
      return;
    }
    if (users.some((u) => u.email === form.email)) {
      alert("Email sudah terdaftar");
      return;
    }

    // Try creating user on backend first so server has canonical id
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      };
      const { data } = await api.post<any>("/api/v1/auth/register", payload);
      const serverUser = data;
      const next = [...users, serverUser];
      setUsers(next);
      saveStoredUsers(next);
      setForm(defaultCreateForm);
      setShowCreateForm(false);
      return;
    } catch (err) {
      // fallback to local creation if backend call fails
    }

    const newUser = createUser({
      name: form.name,
      email: form.email,
      role: (form.role || "employee") as UserRole,
      password: form.password,
      isActive: true,
    });
    setUsers([...users, newUser]);
    setForm(defaultCreateForm);
    setShowCreateForm(false);
  };

  const getUserStatus = (item: User) =>
    item.status || (item.isActive === false ? "inactive" : "active");

  const refreshUsers = async () => {
    try {
      const { data } = await api.get<User[]>("/api/v1/users");
      setUsers(data);
      saveStoredUsers(data);
    } catch {
      // keep existing local users if refresh fails
    }
  };

  const saveUser = async () => {
    if (!selectedUser) return;
    if (!form.name || !form.email || !form.role) {
      alert("Mohon lengkapi nama, email, dan role");
      return;
    }

    try {
      const payload: {
        name: string;
        email: string;
        role: UserRole;
        password?: string;
      } = {
        name: form.name,
        email: form.email,
        role: form.role,
      };

      if (form.password) {
        payload.password = form.password;
      }

      await api.put(`/api/v1/users/${selectedUser.id}`, payload);
      await refreshUsers();
      setSelectedUser(null);
      setForm(defaultCreateForm);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal memperbarui user");
    }
  };

  const deactivateUser = async (id: number) => {
    const targetUser = users.find((item) => item.id === id);
    if (!targetUser || getUserStatus(targetUser) !== "active") return;

    try {
      await api.delete(`/api/v1/users/${id}`);
      await refreshUsers();
      alert("Akun berhasil dinonaktifkan");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal menonaktifkan user");
    }
  };

  const reactivateUser = async (id: number) => {
    const targetUser = users.find((item) => item.id === id);
    if (!targetUser || getUserStatus(targetUser) !== "inactive") return;

    try {
      await api.post(`/api/v1/users/${id}/reactivate`);
      await refreshUsers();
      alert("Akun berhasil diaktifkan kembali");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal mengaktifkan kembali user");
    }
  };

  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  const visibleUsers = users.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE,
  );

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">User Management</h1>
              <p className="mt-2 text-sm text-slate-600">
                Lihat semua akun, edit data, dan nonaktifkan akun.
              </p>
            </div>
            {!showCreateForm && !selectedUser ? (
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
                onClick={() => setShowCreateForm(true)}
              >
                + Tambah User
              </button>
            ) : null}
          </div>
        </div>

        {showCreateForm ? (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Tambah User Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Nama</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Masukkan nama lengkap"
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Masukkan email"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Masukkan password"
                  value={form.password || ""}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Role</label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.role || "employee"}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as UserRole })
                  }
                >
                  <option value="admin">Admin</option>
                  <option value="lead">Lead</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
                onClick={handleCreateUser}
              >
                Simpan
              </button>
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700"
                onClick={() => {
                  setShowCreateForm(false);
                  setForm(defaultCreateForm);
                }}
              >
                Batal
              </button>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.email}</td>
                  <td className="px-4 py-3">{getRoleLabel(item.role)}</td>
                  <td className="px-4 py-3">
                    {getUserStatus(item) === "inactive" ? "Nonaktif" : "Aktif"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="text-slate-700 underline"
                        onClick={() => openEdit(item)}
                      >
                        Edit
                      </button>
                      {getUserStatus(item) === "active" ? (
                        <button
                          className="text-slate-700 underline"
                          onClick={() => deactivateUser(item.id)}
                        >
                          Nonaktifkan
                        </button>
                      ) : (
                        <button
                          className="text-slate-700 underline"
                          onClick={() => reactivateUser(item.id)}
                        >
                          Aktifkan
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-600">
            Menampilkan {visibleUsers.length} dari {users.length} user
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Sebelumnya
            </button>
            <span className="px-2">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Berikutnya
            </button>
          </div>
        </div>

        {selectedUser ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Edit Akun</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Nama</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Password Baru
                </label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.password || ""}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Role</label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.role || "employee"}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as UserRole })
                  }
                >
                  <option value="admin">Admin</option>
                  <option value="lead">Lead</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
                onClick={saveUser}
              >
                Simpan
              </button>
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700"
                onClick={() => setSelectedUser(null)}
              >
                Batal
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
