import type { Team } from "@/types/team";
import type { User, UserRole } from "@/types/user";

const USERS_STORAGE_KEY = "taskManagerUsers";
const TEAMS_STORAGE_KEY = "taskManagerTeams";

const defaultUsers: User[] = [
  {
    id: 1,
    name: "Admin Utama",
    email: "admin@example.com",
    role: "admin",
    status: "active",
    isActive: true,
  },
  {
    id: 2,
    name: "Lead Tim A",
    email: "lead@example.com",
    role: "lead",
    status: "active",
    isActive: true,
  },
  {
    id: 3,
    name: "Employee Satu",
    email: "employee1@example.com",
    role: "employee",
    status: "active",
    isActive: true,
  },
  {
    id: 4,
    name: "Employee Dua",
    email: "employee2@example.com",
    role: "employee",
    status: "active",
    isActive: true,
  },
];

const defaultTeams: Team[] = [
  {
    id: 1,
    name: "Tim A",
    description: "Tim produksi utama",
    leadId: 2,
    memberIds: [3, 4],
  },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getStoredUsers(): User[] {
  return loadFromStorage<User[]>(USERS_STORAGE_KEY, defaultUsers);
}

export function saveStoredUsers(users: User[]) {
  saveToStorage(USERS_STORAGE_KEY, users);
}

export function getStoredTeams(): Team[] {
  return loadFromStorage<Team[]>(TEAMS_STORAGE_KEY, defaultTeams);
}

export function saveStoredTeams(teams: Team[]) {
  saveToStorage(TEAMS_STORAGE_KEY, teams);
}

export function getUserLabel(user?: User | null) {
  if (!user) return "-";
  return `${user.name} (${user.email})`;
}

const validRoles: UserRole[] = ["admin", "lead", "employee"];

export function isValidUserRole(role?: string): role is UserRole {
  return !!role && validRoles.includes(role as UserRole);
}

export function getRoleLabel(role?: UserRole | string) {
  if (!role || !isValidUserRole(role)) return "-";
  return (
    (role as UserRole).charAt(0).toUpperCase() + (role as UserRole).slice(1)
  );
}

export function getNextUserId(): number {
  const users = getStoredUsers();
  const teams = getStoredTeams();
  const userIds = users
    .map((u) => Number(u.id))
    .filter((n) => !Number.isNaN(n));
  const teamIds = teams
    .flatMap((t) => [t.leadId, ...(t.memberIds || [])])
    .map((n) => Number(n))
    .filter((n) => !Number.isNaN(n));
  const allIds = [...userIds, ...teamIds];
  if (allIds.length === 0) return Date.now();
  const maxId = Math.max(...allIds);
  // ensure new id is greater than any existing id
  return maxId + 1;
}

export function createUser(user: Omit<User, "id">): User {
  const newUser: User = {
    ...user,
    id: getNextUserId(),
    status: user.status ?? "active",
  };
  const users = getStoredUsers();
  users.push(newUser);
  saveStoredUsers(users);
  return newUser;
}

export function getNextTeamId(): number {
  const teams = getStoredTeams();
  return teams.length > 0 ? Math.max(...teams.map((t) => t.id)) + 1 : 1;
}

export function createTeam(team: Omit<Team, "id">): Team {
  const newTeam: Team = {
    ...team,
    id: getNextTeamId(),
  };
  const teams = getStoredTeams();
  teams.push(newTeam);
  saveStoredTeams(teams);
  return newTeam;
}

export function updateTeam(id: number, updates: Partial<Team>): Team | null {
  const teams = getStoredTeams();
  const team = teams.find((t) => t.id === id);
  if (!team) return null;

  const updatedTeam = { ...team, ...updates, id };
  const updatedTeams = teams.map((t) => (t.id === id ? updatedTeam : t));
  saveStoredTeams(updatedTeams);
  return updatedTeam;
}

export function deleteTeam(id: number): boolean {
  const teams = getStoredTeams();
  const filtered = teams.filter((t) => t.id !== id);
  if (filtered.length === teams.length) return false;
  saveStoredTeams(filtered);
  return true;
}
