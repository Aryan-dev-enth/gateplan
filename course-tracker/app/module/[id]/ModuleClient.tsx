"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUser, toggleLecture, toggleAllLectures } from "@/lib/store";
import ProgressBar from "@/components/ProgressBar";
import ThemeToggle from "@/components/ThemeToggle";
import EtaCard from "@/components/EtaCard";
import type { Module } from "@/lib/courseLoader";
import type { WeekData } from "@/app/weekly/page";

const TYPE_META: Record<string, { icon: string; color: string }> = {
  video:     { icon: "▶", color: "#6378ff" },
  pdf:       { icon: "📄", color: "#f59e0b" },
  liveclass: { icon: "🔴", color: "#ef4444" },
  file:      { icon: "📎", color: "#22d3a5" },
};

export default function ModuleClient({
  module,
  subjectId,
  durationMap = {},
  weeks = [],
}: {
  module: Module;
  subjectId: string;
  durationMap?: Record<string, number>;
  weeks?: WeekData[];
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [completed, setCompleted] = useState<Record<string, number | false>>({});

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace("/"); return; }
    setUsername(u);
    getUser(u).then((data) => setCompleted(data.completedLectures));
  }, [router]);

  async function handleToggle(lectureId: string) {
    const next = await toggleLecture(username, lectureId);
    setCompleted((prev) => ({ ...prev, [lectureId]: next }));
  }

  async function handleToggleAll() {
    const ids = module.lectures.filter((l) => l.isLecture).map((l) => l.id);
    const next = await toggleAllLectures(username, ids);
    setCompleted({ ...next });
  }

  const done = module.lectures.filter((l) => l.isLecture && !!completed[l.id]).length;
  const total = module.lectures.filter(l => l.isLecture).length;
  const moduleLectures = module.lectures.filter(l => l.isLecture);
  const moduleLectureIdSet = new Set(moduleLectures.map(l => l.id));
  const moduleTotalHours = moduleLectures.reduce((s, l) => s + (durationMap[l.id] ?? 0) / 3600, 0);
  const moduleDoneHours = moduleLectures.filter(l => !!completed[l.id]).reduce((s, l) => s + (durationMap[l.id] ?? 0) / 3600, 0);
  const moduleRemainingHours = Math.max(0, moduleTotalHours - moduleDoneHours);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="glow-orb w-96 h-96 -top-32 -left-32" style={{ background: "rgba(99,120,255,0.07)" }} />
      <div className="glow-orb w-64 h-64 bottom-0 right-0" style={{ background: "rgba(34,211,165,0.05)" }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Nav */}
        <div className="flex items-center justify-between mb-8 fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/dashboard" className="text-sm hover:opacity-80 transition-all flex-shrink-0" style={{ color: "var(--muted)" }}>
              Dashboard
            </Link>
            <span style={{ color: "var(--border)" }}>›</span>
            <Link href={`/subject/${subjectId}`} className="text-sm hover:opacity-80 transition-all truncate max-w-[100px]" style={{ color: "var(--muted)" }}>
              Subject
            </Link>
            <span style={{ color: "var(--border)" }}>›</span>
            <span className="text-sm truncate max-w-[120px]" style={{ color: "var(--text)" }}>{module.name}</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="glass p-6 mb-4 fade-in-1 relative overflow-hidden">
          <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>{module.name}</h1>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>{total} items</p>
          <div className="flex items-center gap-3">
            <div className="flex-1"><ProgressBar value={done} total={total} /></div>
            <button
              onClick={handleToggleAll}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-semibold hover:opacity-80 transition-all"
              style={{
                background: done === total && total > 0 ? "rgba(239,68,68,0.1)" : "rgba(34,211,165,0.12)",
                border: `1px solid ${done === total && total > 0 ? "rgba(239,68,68,0.25)" : "rgba(34,211,165,0.25)"}`,
                color: done === total && total > 0 ? "#ef4444" : "var(--green)",
              }}
            >
              {done === total && total > 0 ? "✕ unmark all" : "✓ mark all"}
            </button>
          </div>
        </div>

        {/* Compact ETA for this module */}
        <div className="mb-6 fade-in-2">
          <EtaCard
            completedMap={completed}
            durationMap={durationMap}
            hoursRemaining={moduleRemainingHours}
            hoursTotal={moduleTotalHours}
            compact
            lectureIdSet={moduleLectureIdSet}
            weeks={weeks}
          />
        </div>

        <div className="flex flex-col gap-2">
          {module.lectures.map((lecture, i) => {
            const isDone = !!completed[lecture.id];
            const ts = completed[lecture.id];
            const meta = TYPE_META[lecture.type] ?? { icon: "•", color: "var(--muted)" };

            return (
              <div
                key={lecture.id}
                className="glass flex items-center gap-4 px-4 py-3.5 transition-all duration-200 hover:scale-[1.005] fade-in cursor-pointer"
                style={{
                  animationDelay: `${i * 0.03}s`,
                  borderColor: isDone ? "rgba(34,211,165,0.2)" : undefined,
                  background: isDone ? "rgba(34,211,165,0.04)" : undefined,
                }}
                onClick={() => handleToggle(lecture.id)}
              >
                <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200"
                  style={{
                    background: isDone ? "var(--green)" : "transparent",
                    border: `2px solid ${isDone ? "var(--green)" : "rgba(99,120,255,0.3)"}`,
                    boxShadow: isDone ? "0 0 10px rgba(34,211,165,0.4)" : "none",
                  }}>
                  {isDone && (
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                  style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}>
                  {meta.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-sm leading-snug block transition-all"
                    style={{ color: isDone ? "var(--muted)" : "var(--text)", textDecoration: isDone ? "line-through" : "none" }}>
                    {lecture.title}
                  </span>
                  {isDone && ts && (
                    <span className="text-xs block mt-0.5" style={{ color: "rgba(34,211,165,0.6)", fontSize: "10px" }}>
                      ✓ {new Date(ts as number).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>

                {lecture.duration > 0 && (
                  <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(99,120,255,0.08)", color: "var(--muted)" }}>
                    {Math.floor(lecture.duration / 60)}m
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {done === total && total > 0 && (
          <div className="mt-6 rounded-2xl p-4 text-center fade-in"
            style={{ background: "rgba(34,211,165,0.08)", border: "1px solid rgba(34,211,165,0.25)" }}>
            <p className="text-lg mb-1">🎉</p>
            <p className="font-semibold text-sm" style={{ color: "var(--green)" }}>Module complete!</p>
          </div>
        )}
      </div>
    </div>
  );
}
