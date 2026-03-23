"use client";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="glow-orb w-96 h-96 -top-32 -right-32" style={{ background: "rgba(239,68,68,0.06)" }} />
      <div className="relative z-10 text-center px-4 fade-in">
        <p className="text-5xl mb-4">⚠️</p>
        <p className="text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>Something went wrong</p>
        <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: "var(--muted)" }}>
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="btn-primary px-6 py-2.5 rounded-xl text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
