import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "./ThemeProvider";

export const metadata: Metadata = {
  title: "Course Tracker",
  description: "GATE Course Tracker & Weekly Planner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
