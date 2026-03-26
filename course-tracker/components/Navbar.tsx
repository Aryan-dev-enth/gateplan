"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logout } from "@/lib/store";
import { useTheme } from "@/app/ThemeProvider";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/dashboard",   label: "Dashboard" },
  { href: "/weekly",      label: "Weekly" },
  { href: "/activity",    label: "Activity" },
  { href: "/log-time",    label: "Log Time" },
  { href: "/leaderboard", label: "Leaderboard" },
];

const HIDDEN_ON = ["/"];

function isActive(href: string, pathname: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [username, setUsername] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUsername(getCurrentUser());
  }, [pathname]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (HIDDEN_ON.includes(pathname) || !username) return null;

  function handleSignOut() {
    if (!confirm("Sign out?")) return;
    logout();
    router.replace("/");
  }

  return (
    <>
      {/* ── Top bar ── */}
      <nav
        className="sticky top-0 z-40 flex items-center justify-between px-6 h-14"
        style={{
          background: "var(--surface)",
          borderBottom: "2px solid var(--border)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        {/* Brand */}
        <Link href="/dashboard" className="text-base font-bold grad-text flex-shrink-0 tracking-tight">
          GatePlan
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, label }) => {
            const active = isActive(href, pathname);
            return (
              <Link key={href} href={href}
                className="px-4 py-2 rounded-lg text-sm transition-all"
                style={{
                  color: active ? "var(--accent)" : "var(--muted)",
                  background: active ? "var(--tint-accent)" : "transparent",
                  border: active ? "1px solid var(--border)" : "1px solid transparent",
                  fontWeight: active ? 600 : 400,
                }}>
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Username — desktop only */}
          <span className="hidden md:block text-xs" style={{ color: "var(--muted)" }}>{username}</span>
          <div className="hidden md:block w-px h-3.5" style={{ background: "var(--border)" }} />

          {/* Theme toggle */}
          <button onClick={toggle}
            className="text-xs px-3 py-2 rounded-lg transition-all hover:opacity-80"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--muted)" }}>
            {theme === "dark" ? "Light" : "Dark"}
          </button>

          {/* Sign out — desktop only */}
          <button onClick={handleSignOut}
            className="hidden md:block text-xs px-3 py-2 rounded-lg transition-all hover:opacity-80"
            style={{ color: "var(--red)", background: "var(--surface2)", border: "1px solid var(--border)" }}>
            Sign out
          </button>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex flex-col items-center justify-center gap-1 w-8 h-8 rounded-lg transition-all"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            aria-label="Menu">
            <span className="block w-4 h-0.5 rounded-full transition-all duration-200"
              style={{ background: "var(--text)", transform: menuOpen ? "rotate(45deg) translate(2px, 2px)" : "none" }} />
            <span className="block w-4 h-0.5 rounded-full transition-all duration-200"
              style={{ background: "var(--text)", opacity: menuOpen ? 0 : 1 }} />
            <span className="block w-4 h-0.5 rounded-full transition-all duration-200"
              style={{ background: "var(--text)", transform: menuOpen ? "rotate(-45deg) translate(2px, -2px)" : "none" }} />
          </button>
        </div>
      </nav>

      {/* ── Mobile dropdown menu ── */}
      {menuOpen && (
        <div
          className="md:hidden fixed top-14 left-0 right-0 z-40 flex flex-col"
          style={{
            background: "var(--surface)",
            borderBottom: "2px solid var(--border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          }}
        >
          {NAV_LINKS.map(({ href, label }) => {
            const active = isActive(href, pathname);
            return (
              <Link key={href} href={href}
                className="px-6 py-4 text-sm transition-all"
                style={{
                  color: active ? "var(--accent)" : "var(--text)",
                  fontWeight: active ? 600 : 400,
                  borderBottom: "1px solid var(--border)",
                  background: active ? "var(--tint-accent)" : "transparent",
                }}>
                {label}
              </Link>
            );
          })}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-xs" style={{ color: "var(--muted)" }}>{username}</span>
            <button onClick={handleSignOut}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ color: "var(--red)", background: "var(--surface2)", border: "1px solid var(--border)" }}>
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
