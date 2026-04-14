"use client";

import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { api, ApiError } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await api.auth.login({ identifier: identifier.trim(), password });
        router.replace("/sessions");
      } else {
        await api.auth.signup({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
        });
        router.replace("/admin/catalog?onboarding=1");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f8fafc_55%,#eef2ff_100%)] px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
        <h1 className="text-2xl font-semibold text-slate-950">Synterix</h1>
        <p className="mt-1 text-sm text-slate-500">Simple account access</p>

        <div className="mt-4 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 rounded px-3 py-2 text-sm ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 rounded px-3 py-2 text-sm ${mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            Create account
          </button>
        </div>

        {error && <div className="mt-4"><ErrorMessage error={error} /></div>}

        <div className="mt-4 space-y-3">
          {mode === "login" ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Email or username</label>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="email"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-5">
          <Button
            onClick={submit}
            loading={loading}
            disabled={
              mode === "login"
                ? !identifier.trim() || !password.trim()
                : !username.trim() || !email.trim() || !password.trim()
            }
            className="w-full"
          >
            {mode === "login" ? "Login" : "Create account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
