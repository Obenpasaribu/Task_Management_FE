"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { removeToken } from "@/lib/auth";
import { hasPermission, hasResourcePermission } from "@/lib/permissions";
import type { ResourceName } from "@/types/permission";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/context/UserContext";
import { useSidebar } from "@/context/SidebarContext";

// Icon Components
const TaskIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
    />
  </svg>
);

const TeamIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 12H9m4 5h4m-10 0H5m14-7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const BriefcaseIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m0 10v10l8 4"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const LogOutIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>
);

const MenuIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 19l-7-7 7-7"
    />
  </svg>
);

export default function Navbar() {
  const { token, setToken } = useAuth();
  const { user, setUser } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { isExpanded, setIsExpanded } = useSidebar();

  const handleLogout = () => {
    removeToken();
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  const isActive = (href: string) => pathname === href;

  // Don't show sidebar on login page
  if (pathname === "/login" || !token) {
    return null;
  }

  const navItems = [
    {
      href: "/tasks",
      label: "Task",
      icon: TaskIcon,
      resource: "tasks" as ResourceName,
      permission: "tasks.view",
    },
    {
      href: "/team",
      label: user?.role === "admin" ? "Team Management" : "Team",
      icon: TeamIcon,
      resource: "team" as ResourceName,
      permission: "team.view",
    },
    {
      href: "/team-task",
      label: "Team Task",
      icon: BriefcaseIcon,
      resource: "teamTask" as ResourceName,
      permission: "teamTask.view",
    },
    {
      href: "/user-management",
      label: "User Management",
      icon: SettingsIcon,
      resource: "users" as ResourceName,
      permission: "users.view",
    },
    {
      href: "/resources",
      label: "Resources",
      icon: SettingsIcon,
      resource: "resources" as ResourceName,
      permission: "resources.view",
    },
  ].filter((item) => hasResourcePermission(user?.role, item.resource));

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white shadow-sm border-r border-slate-200 transition-all duration-300 flex flex-col ${
        isExpanded ? "w-64" : "w-20"
      }`}
    >
      {/* Header */}
      <div className="px-4 py-6 border-b border-slate-200 flex items-center justify-between">
        {isExpanded && (
          <Link href="/tasks" className="text-xl font-bold text-slate-900">
            Task Manager
          </Link>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <ChevronLeftIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <div className="space-y-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isExpanded ? "" : item.label}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                } ${isExpanded ? "" : "justify-center"}`}
              >
                <IconComponent />
                {isExpanded && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-slate-200 p-3">
        {isExpanded ? (
          <>
            <div className="mb-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-600">Logged in as</p>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-slate-600 capitalize">{user?.role}</p>
            </div>
            <button
              className="w-full flex items-center gap-2 justify-center rounded-lg bg-red-50 px-4 py-2 font-medium text-red-600 hover:bg-red-100 transition-colors"
              onClick={handleLogout}
            >
              <LogOutIcon />
              Logout
            </button>
          </>
        ) : (
          <button
            className="w-full flex items-center justify-center rounded-lg bg-red-50 p-2.5 text-red-600 hover:bg-red-100 transition-colors"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOutIcon />
          </button>
        )}
      </div>
    </aside>
  );
}
