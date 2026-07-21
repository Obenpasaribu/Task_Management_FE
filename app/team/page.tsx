"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/context/UserContext";
import { getUserLabel, saveStoredUsers, getStoredUsers } from "@/lib/mockData";
import { hasPermission } from "@/lib/permissions";
import { useTeams } from "@/hooks/useTeams";
import api from "@/lib/api";
import { useUsers } from "@/hooks/useUsers";
import type { Team } from "@/types/team";
import type { User } from "@/types/user";

export default function TeamPage() {
  const router = useRouter();
  const { token, isReady } = useAuth();
  const { user } = useUser();
  const {
    teams,
    isLoading,
    error,
    status,
    createTeam,
    updateTeam,
    deleteTeam,
    fetchTeams,
  } = useTeams({
    path:
      user?.role === "admin"
        ? "/api/v1/teams"
        : user?.role === "lead"
          ? "/api/v1/teams/my"
          : "/api/v1/teams",
  });
  const { users } = useUsers();
  const [serverEmployees, setServerEmployees] = useState<User[] | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [form, setForm] = useState<Partial<Team>>({});

  useEffect(() => {
    if (!isReady) return;
    if (!token) {
      router.replace("/login");
    }
  }, [isReady, router, token]);

  useEffect(() => {
    if (!isReady) return;
    if (status === 401) {
      router.replace("/login");
    }
  }, [isReady, router, status]);

  const currentTeam = useMemo(() => {
    if (!user?.id || teams.length === 0) return null;
    const currentUserId = Number(user.id);
    return (
      teams.find(
        (team) =>
          Number(team.leadId) === currentUserId ||
          team.memberIds.map(Number).includes(currentUserId),
      ) || null
    );
  }, [teams, user?.id]);

  const getUserById = (id?: number | string) =>
    users.find((item) => item.id === Number(id));

  const getTeamMembers = (team: Team) =>
    team.memberIds
      .map(getUserById)
      .filter((member): member is User => Boolean(member))
      .filter((member) => member.role === "employee");

  const sanitizeMemberIds = (leadId: number, memberIds?: number[]) =>
    Array.from(new Set((memberIds || []).filter((id) => id !== leadId)));

  const handleCreateTeam = async () => {
    if (!form.name || !form.description || !form.leadId) {
      alert("Mohon lengkapi semua field");
      return;
    }
    await createTeam({
      name: form.name,
      description: form.description,
      leadId: form.leadId,
      memberIds: sanitizeMemberIds(form.leadId, form.memberIds),
    });
    setForm({});
    setShowCreateForm(false);
  };

  const handleEditTeam = (team: Team) => {
    (async () => {
      setSelectedTeam(team);
      // Try to fetch canonical user list from server to remap ids
      try {
        const res = await api.get<any[]>("/api/v1/users");
        const serverUsers = res.data || [];
        // persist server users locally so UI lists match server
        saveStoredUsers(serverUsers);
        setServerEmployees(serverUsers.filter((u) => u.role === "employee"));

        // map local member ids -> emails -> server ids
        const localUsers = getStoredUsers();
        const mappedMemberIds = team.memberIds
          .map((localId) => {
            const localUser = localUsers.find(
              (u) => Number(u.id) === Number(localId),
            );
            if (!localUser) return null;
            const serverUser = serverUsers.find(
              (su) =>
                (su.email || "").toLowerCase() ===
                (localUser.email || "").toLowerCase(),
            );
            return serverUser ? Number(serverUser.id) : null;
          })
          .filter((x): x is number => typeof x === "number");

        setForm({
          name: team.name,
          description: team.description,
          leadId: team.leadId,
          memberIds: mappedMemberIds,
        });
      } catch (err) {
        // fallback to original behavior if server fetch fails
        setForm({
          name: team.name,
          description: team.description,
          leadId: team.leadId,
          memberIds: team.memberIds.map(Number),
        });
      }
    })();
  };

  const handleUpdateTeam = async () => {
    if (!selectedTeam) return;
    if (!form.name || !form.description || !form.leadId) {
      alert("Mohon lengkapi semua field");
      return;
    }
    // Client-side validation: ensure lead exists and is lead role
    const leadUser = users.find((u) => u.id === Number(form.leadId));
    if (!leadUser) {
      alert(`Lead with id ${form.leadId} not found`);
      return;
    }
    if (leadUser.role !== "lead") {
      alert("Selected lead is not a lead role");
      return;
    }
    // Validate against server user list to avoid sending invalid IDs
    try {
      const res = await api.get<any[]>("/api/v1/users");
      const serverUsers = res.data || [];
      const members = (form.memberIds || []).map(Number);
      const missingOnServer = members.filter(
        (m) => !serverUsers.find((u) => Number(u.id) === m),
      );
      if (missingOnServer.length > 0) {
        alert(`User id(s) not found on server: [${missingOnServer.join(",")}]`);
        return;
      }
      const wrongRoleOnServer = members.filter((m) => {
        const u = serverUsers.find((x) => Number(x.id) === m);
        return u ? u.role !== "employee" : true;
      });
      if (wrongRoleOnServer.length > 0) {
        alert(
          `User id(s) not employee on server: [${wrongRoleOnServer.join(",")}]`,
        );
        return;
      }

      const leadIdNum = Number(form.leadId);
      const leadOnServer = serverUsers.find((u) => Number(u.id) === leadIdNum);
      if (!leadOnServer) {
        alert(`Lead id ${leadIdNum} not found on server`);
        return;
      }
      if (leadOnServer.role !== "lead") {
        alert("Selected lead is not a lead role on server");
        return;
      }

      const normalizedPayload = {
        name: form.name,
        description: form.description,
        lead_id: leadIdNum,
        member_ids: sanitizeMemberIds(leadIdNum, members),
      };

      console.info("PUT payload:", normalizedPayload);

      await updateTeam(selectedTeam.id, {
        name: form.name,
        description: form.description,
        leadId: leadIdNum,
        memberIds: normalizedPayload.member_ids,
      });
    } catch (err: any) {
      const statusCode = err?.response?.status;
      if (statusCode === 401) {
        alert("Authentication required. Please login again.");
        return;
      }
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;
      alert(serverMsg || "Gagal memverifikasi daftar user pada server");
      return;
    }
    try {
      await fetchTeams();
      setSelectedTeam(null);
      setForm({});
    } catch (err: any) {
      // updateTeam will throw for 4xx errors; show server message
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Gagal memperbarui tim";
      alert(msg);
    }
  };

  const handleDeleteTeam = async (id: number) => {
    if (confirm("Yakin ingin menghapus tim ini?")) {
      await deleteTeam(id);
    }
  };

  const handleMemberToggle = (memberId: number) => {
    const id = Number(memberId);
    const currentMembers = (form.memberIds || []).map(Number);
    const newMembers = currentMembers.includes(id)
      ? currentMembers.filter((m) => m !== id)
      : [...currentMembers, id];
    setForm({ ...form, memberIds: newMembers });
  };

  const getLeadUsers = () => users.filter((u) => u.role === "lead");
  const getEmployeeUsers = () =>
    users.filter((u) => u.role === "employee" && getUserStatus(u) === "active");

  const getUserStatus = (item: User) =>
    item.status || (item.isActive === false ? "inactive" : "active");

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Team</h1>
              <p className="mt-2 text-sm text-slate-600">
                Lihat lead dan employee yang tergabung dalam tim Anda.
              </p>
            </div>
            {user?.role === "admin" && !showCreateForm && !selectedTeam ? (
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
                onClick={() => setShowCreateForm(true)}
              >
                + Tambah Tim
              </button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Memuat data tim...
          </div>
        ) : showCreateForm ? (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Buat Tim Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nama Tim
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Masukkan nama tim"
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Deskripsi
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Masukkan deskripsi tim"
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Lead</label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.leadId || ""}
                  onChange={(e) =>
                    setForm({ ...form, leadId: parseInt(e.target.value) })
                  }
                >
                  <option value="">Pilih Lead</option>
                  {getLeadUsers().map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {getUserLabel(lead)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Employee
                </label>
                <div className="space-y-2 rounded-lg border border-slate-300 p-3">
                  {(serverEmployees ?? getEmployeeUsers()).map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(form.memberIds || []).includes(emp.id)}
                        onChange={() => handleMemberToggle(emp.id)}
                      />
                      <span className="text-sm">{getUserLabel(emp)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
                onClick={handleCreateTeam}
              >
                Simpan
              </button>
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700"
                onClick={() => {
                  setShowCreateForm(false);
                  setForm({});
                }}
              >
                Batal
              </button>
            </div>
          </div>
        ) : selectedTeam ? (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Edit Tim</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nama Tim
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Deskripsi
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Lead</label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.leadId || ""}
                  onChange={(e) =>
                    setForm({ ...form, leadId: parseInt(e.target.value) })
                  }
                >
                  <option value="">Pilih Lead</option>
                  {getLeadUsers().map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {getUserLabel(lead)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Employee
                </label>
                <div className="space-y-2 rounded-lg border border-slate-300 p-3">
                  {(serverEmployees ?? getEmployeeUsers()).map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(form.memberIds || []).includes(emp.id)}
                        onChange={() => handleMemberToggle(emp.id)}
                      />
                      <span className="text-sm">{getUserLabel(emp)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
                onClick={handleUpdateTeam}
              >
                Simpan Perubahan
              </button>
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700"
                onClick={() => {
                  setSelectedTeam(null);
                  setForm({});
                }}
              >
                Batal
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {user?.role === "admin" ? (
          <div className="space-y-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{team.name}</h2>
                    <p className="text-sm text-slate-600">{team.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-slate-700 underline"
                      onClick={() => handleEditTeam(team)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 underline"
                      onClick={() => handleDeleteTeam(team.id)}
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lead
                    </p>
                    <p className="mt-1 font-medium">
                      {getUserLabel(getUserById(team.leadId))}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Employee
                    </p>
                    <div className="mt-1 space-y-1">
                      {getTeamMembers(team).length > 0 ? (
                        getTeamMembers(team).map((member) => (
                          <p key={member.id} className="text-sm">
                            {getUserLabel(member)}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">-</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : teams.length > 0 ? (
          <div className="space-y-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-xl font-semibold">{team.name}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {team.description}
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Lead Team
                    </p>
                    <p className="mt-2 font-medium">
                      {getUserLabel(getUserById(team.leadId))}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Employee
                    </p>
                    <div className="mt-2 space-y-1">
                      {getTeamMembers(team).map((member) => (
                        <p key={member.id} className="text-sm">
                          {getUserLabel(member)}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            Belum ada tim yang terhubung dengan akun Anda.
          </div>
        )}
      </div>
    </main>
  );
}
