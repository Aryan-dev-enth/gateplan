"use client";
import { useTheme } from "@/app/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center w-9 h-9 rounded-xl transition-all hover:scale-105"
      style={{
        background: "rgba(99,120,255,0.1)",
        border: "1px solid var(--border)",
        color: "var(--muted)",
        fontSize: "1rem",
      }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
