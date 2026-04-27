import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "./ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "GatePlan",
  description: "GATE Course Tracker & GO Classes Weekly Planner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var saved = localStorage.getItem("ct_theme_v2");
              var theme = saved || "dark";
              if (theme === "light") {
                document.documentElement.classList.add("light");
                document.documentElement.classList.remove("dark");
              } else {
                document.documentElement.classList.add("dark");
                document.documentElement.classList.remove("light");
              }
            } catch (e) {}
          })()
        ` }} />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ToastProvider>
          <ThemeProvider>
            <Navbar />
            {children}
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
