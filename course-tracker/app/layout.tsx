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
    <html lang="en">
      <body className="min-h-screen antialiased">
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
