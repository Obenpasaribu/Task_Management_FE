"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useUser } from "@/context/UserContext";
import type { User, UserRole } from "@/types/user";

const roleOptions: UserRole[] = ["admin", "lead", "employee"];
const AUTH_LOGIN_PATH = "api/v1/auth/login";
const AUTH_REGISTER_PATH = "api/v1/auth/register";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { setToken } = useAuth();
  const { setUser } = useUser();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState<UserRole>("employee");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const validateEmail = (value: string) => emailRegex.test(value);

  const handleLogin = async () => {
    if (!validateEmail(email)) {
      setError("Email tidak valid.");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.post(AUTH_LOGIN_PATH, {
        email,
        password,
      });
      const token = data?.token || data?.access_token;
      const user = data?.user as User | undefined;
      if (!token) {
        setError("Login gagal. Token tidak diterima dari backend.");
        return;
      }
      setToken(token);
      if (user) {
        setUser(user);
      }
      router.push("/tasks");
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError(err?.response?.data?.message || "Email atau password salah.");
      } else if (err?.response?.status === 403) {
        setError(
          err?.response?.data?.message === "account inactive"
            ? "Akun Anda tidak aktif. Silakan hubungi admin."
            : err?.response?.data?.message ||
                "Akun Anda tidak aktif. Silakan hubungi admin.",
        );
      } else {
        setError(
          err?.response?.data?.message ||
            "Login gagal. Periksa email/password Anda.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError("Nama wajib diisi.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Email tidak valid.");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    if (!roleOptions.includes(role)) {
      setError("Role tidak valid.");
      return;
    }

    setIsLoading(true);

    try {
      await api.post(AUTH_REGISTER_PATH, {
        name: name.trim(),
        email,
        password,
        role,
      });
      setSuccess(
        "Registrasi berhasil. Silakan login menggunakan akun baru Anda.",
      );
      setMode("login");
      setPassword("");
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError(
          "Registrasi gagal: backend belum menyediakan endpoint /api/v1/auth/register.",
        );
      } else {
        setError(
          err?.response?.data?.message ||
            "Registrasi gagal. Periksa input Anda dan coba lagi.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (mode === "login") {
      await handleLogin();
    } else {
      await handleRegister();
    }
  };

  const switchMode = (nextMode: "login" | "register") => {
    setMode(nextMode);
    resetMessages();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              mode === "login"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              mode === "register"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Daftar
          </button>
        </div>

        <h1 className="text-2xl font-semibold">
          {mode === "login" ? "Login" : "Registrasi Akun"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {mode === "login"
            ? "Masuk untuk mengelola task Anda."
            : "Daftar untuk membuat akun baru sebagai admin, lead, atau employee."}
        </p>

        {success ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {mode === "register" ? (
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {mode === "register" ? (
            <div>
              <label className="mb-1 block text-sm font-medium">Role</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                {roleOptions.map((item) => (
                  <option key={item} value={item}>
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-slate-500">
                Pilih role: admin, lead, atau employee.
              </p>
            </div>
          ) : null}

          <button
            className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-70"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
          </button>
        </form>
      </div>
    </main>
  );
}
