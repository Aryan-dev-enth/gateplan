"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, loginOrRegister, setCurrentUser, userExists } from "@/lib/store";

type Status = "idle" | "loading" | "error";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [isNew, setIsNew] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const u = getCurrentUser();
    if (u) router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    if (username.trim().length > 0) {
      userExists(username.trim()).then((exists) => setIsNew(!exists));
    }
  }, [username]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    if (!u || !password) return;
    setStatus("loading");
    setError("");
    const result = await loginOrRegister(u, password);
    if (result === "wrong_password") {
      setError("Incorrect password. Try again.");
      setStatus("error");
      return;
    }
    setCurrentUser(u);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Glow orbs */}
      <div className="glow-orb w-96 h-96 -top-32 -left-32" style={{ background: "rgba(99,120,255,0.15)" }} />
      <div className="glow-orb w-80 h-80 -bottom-20 -right-20" style={{ background: "rgba(167,139,250,0.12)" }} />

      <div className="w-full max-w-sm relative z-10 fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, rgba(99,120,255,0.2), rgba(167,139,250,0.2))", border: "1px solid rgba(99,120,255,0.3)" }}>
            <span className="text-3xl">⚡</span>
          </div>
          <h1 className="text-3xl font-bold grad-text mb-1">GatePlan</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Your GATE study command center</p>
        </div>

        <form onSubmit={handleSubmit} className="glass p-6 flex flex-col gap-5">
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold mb-2 tracking-wider uppercase" style={{ color: "var(--muted)" }}>
              Username
            </label>
            <input
              autoFocus
              autoComplete="username"
              className="input-glow w-full rounded-xl px-4 py-3 text-sm transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(99,120,255,0.2)",
                color: "var(--text)",
              }}
              placeholder="e.g. aryan"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
            />
            {username.trim().length > 0 && (
              <p className="text-xs mt-1.5 flex items-center gap-1"
                style={{ color: isNew ? "var(--green)" : "var(--accent2)" }}>
                <span>{isNew ? "✦" : "✓"}</span>
                {isNew ? "New account will be created" : "Welcome back!"}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold mb-2 tracking-wider uppercase" style={{ color: "var(--muted)" }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                className="input-glow w-full rounded-xl px-4 py-3 text-sm pr-10 transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(99,120,255,0.2)",
                  color: "var(--text)",
                }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: "var(--muted)" }}
              >
                {showPass ? "hide" : "show"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-2.5 text-xs flex items-center gap-2"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              <span>⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!username.trim() || !password || status === "loading"}
            className="btn-primary w-full rounded-xl py-3 text-sm"
          >
            {status === "loading"
              ? "Authenticating..."
              : isNew && username.trim()
              ? "Create Account →"
              : "Sign In →"}
          </button>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: "var(--muted)" }}>
          No account? Just pick a username and password to get started.
        </p>
      </div>
    </div>
  );
}
