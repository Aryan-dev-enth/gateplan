import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="glow-orb w-96 h-96 -top-32 -right-32" style={{ background: "rgba(99,120,255,0.08)" }} />
      <div className="glow-orb w-64 h-64 bottom-0 -left-32" style={{ background: "rgba(239,68,68,0.05)" }} />
      <div className="relative z-10 text-center px-4 fade-in">
        <p className="text-7xl font-bold grad-text mb-4">404</p>
        <p className="text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>Page not found</p>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          This page doesn&apos;t exist or was moved.
        </p>
        <Link
          href="/dashboard"
          className="btn-primary px-6 py-2.5 rounded-xl text-sm inline-block"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
