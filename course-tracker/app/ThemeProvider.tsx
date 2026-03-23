"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function useTheme() { return useContext(ThemeCtx); }

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("ct_theme") as Theme | null;
    const t = saved ?? "dark";
    setTheme(t);
    document.documentElement.classList.toggle("light", t === "light");
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("ct_theme", next);
      document.documentElement.classList.toggle("light", next === "light");
      return next;
    });
  }

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}
