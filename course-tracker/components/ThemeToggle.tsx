"use client";
import { useTheme } from "@/app/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105"
      style={{
        background: "var(--tint-accent)",
        border: "1px solid var(--border)",
        color: "var(--muted)",
        fontSize: "0.9rem",
      }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
