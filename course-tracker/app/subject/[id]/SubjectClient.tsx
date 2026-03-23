"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUser, toggleLecture, toggleAllLectures } from "@/lib/store";
import ProgressBar from "@/components/ProgressBar";
import ThemeToggle from "@/components/ThemeToggle";
import EtaCard from "@/components/EtaCard";
import type { Subject } from "@/lib/courseLoader";
import type { WeekData } from "@/app/weekly/page";

const TYPE_META: Record<string, { icon: string; color: string }> = {
  video:     { icon: "▶", color: "#6378ff" },
  pdf:       { icon: "📄", color: "#f59e0b" },
  liveclass: { icon: "🔴", color: "#ef4444" },
  file:      { icon: "📎", color: "#22d3a5" },
};

export default function SubjectClient({
  subject,
  durationMap = {},
  weeks = [],
}: {
  subject: Subject;
  durationMap?: Record<string, number>;
  weeks?: WeekData[];
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [completedMap, setCompletedMap] = useState<Record<string, number | false>>({});
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace("/"); return; }
    setUsername(u);
    getUser(u).then((data) => setCompletedMap(data.completedLectures));
  }, [router]);

  function toggleModule(id: string) {
    setOpenModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleToggle(lectureId: string) {
    const next = await toggleLecture(username, lectureId);
    setCompletedMap((prev) => ({ ...prev, [lectureId]: next }));
  }

  async function handleToggleAllInModule(moduleId: string, lectureIds: string[], e: React.MouseEvent) {
    e.stopPropagation();
    const next = await toggleAllLectures(username, lectureIds);
    setCompletedMap({ ...next });
  }

  const totalDone = subject.modules.reduce(
    (s, m) => s + m.lectures.filter((l) => l.isLecture && !!completedMap[l.id]).length, 0
  );
  const totalAll = subject.modules.reduce((s, m) => s + m.lectures.filter(l => l.isLecture).length, 0);

  const subjectLectures = subject.modules.flatMap((m) => m.lectures.filter((l) => l.isLecture));
  const subjectLectureIdSet = new Set(subjectLectures.map((l) => l.id));
  const subjectTotalHours = subjectLectures.reduce((s, l) => s + (durationMap[l.id] ?? 0) / 3600, 0);
  const subjectDoneHours = subjectLectures.filter((l) => !!completedMap[l.id]).reduce((s, l) => s + (durationMap[l.id] ?? 0) / 3600, 0);
  const subjectRemainingHours = Math.max(0, subjectTotalHours - subjectDoneHours);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="glow-orb w-96 h-96 -top-32 -right-32" style={{ background: "rgba(99,120,255,0.08)" }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Nav */}
        <div className="flex items-center justify-between mb-8 fade-in">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm hover:opacity-80 transition-all" style={{ color: "var(--muted)" }}>
              ← Dashboard
            </Link>
            <span style={{ color: "var(--border)" }}>›</span>
            <span className="text-sm truncate max-w-[160px]" style={{ color: "var(--text)" }}>{subject.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/weekly" className="text-xs px-3 py-1.5 rounded-xl transition-all"
              style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--accent2)" }}>
              📅 Weekly
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Header */}
        <div className="glass p-6 mb-4 fade-in-1 relative overflow-hidden">
          <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>{subject.name}</h1>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            {subject.modules.length} modules · {totalAll} lectures
          </p>
          <ProgressBar value={totalDone} total={totalAll} />
        </div>

        {/* Subject ETA */}
        <div className="mb-6 fade-in-2">
          <EtaCard
            completedMap={completedMap}
            durationMap={durationMap}
            hoursRemaining={subjectRemainingHours}
            hoursTotal={subjectTotalHours}
            lectureIdSet={subjectLectureIdSet}
            weeks={weeks}
          />
        </div>

        {/* Tree */}
        <div className="flex flex-col gap-2 fade-in-2">
          {subject.modules.map((mod, mi) => {
            const total = mod.lectures.filter(l => l.isLecture).length;
            const done = mod.lectures.filter((l) => l.isLecture && !!completedMap[l.id]).length;
            const pct = total === 0 ? 0 : Math.round((done / total) * 100);
            const isComplete = pct === 100 && total > 0;
            const isOpen = openModules.has(mod.id);
            const modLectureIds = mod.lectures.filter((l) => l.isLecture).map((l) => l.id);

            return (
              <div key={mod.id} className="glass overflow-hidden transition-all duration-200"
                style={{ animationDelay: `${mi * 0.04}s` }}>

                {/* Module header row — click to expand */}
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center gap-4 px-4 py-4 text-left transition-all hover:opacity-90"
                >
                  {/* Number / check */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{
                      background: isComplete ? "rgba(34,211,165,0.15)" : "rgba(99,120,255,0.1)",
                      border: `1px solid ${isComplete ? "rgba(34,211,165,0.3)" : "rgba(99,120,255,0.2)"}`,
                      color: isComplete ? "var(--green)" : "var(--accent2)",
                    }}>
                    {isComplete ? "✓" : mi + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{mod.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{done}/{total} done</p>
                  </div>

                  {/* Progress pill */}
                  <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background: isComplete ? "rgba(34,211,165,0.12)" : "rgba(99,120,255,0.1)",
                      color: isComplete ? "var(--green)" : "var(--accent2)",
                    }}>
                    {pct}%
                  </span>

                  {/* Mark all button */}
                  <button
                    onClick={(e) => handleToggleAllInModule(mod.id, modLectureIds, e)}
                    className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg font-semibold hover:opacity-80 transition-all"
                    style={{
                      background: isComplete ? "rgba(239,68,68,0.1)" : "rgba(34,211,165,0.1)",
                      border: `1px solid ${isComplete ? "rgba(239,68,68,0.2)" : "rgba(34,211,165,0.2)"}`,
                      color: isComplete ? "#ef4444" : "var(--green)",
                    }}
                  >
                    {isComplete ? "✕ unmark" : "✓ all"}
                  </button>

                  {/* Chevron */}
                  <span className="flex-shrink-0 text-xs transition-transform duration-200"
                    style={{
                      color: "var(--muted)",
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                      display: "inline-block",
                    }}>
                    ›
                  </span>
                </button>

                {/* Lecture tree — visible when open */}
                {isOpen && (
                  <div className="pb-2" style={{ borderTop: "1px solid rgba(99,120,255,0.08)" }}>
                    {mod.lectures.map((lecture, li) => {
                      const isDone = !!completedMap[lecture.id];
                      const ts = completedMap[lecture.id];
                      const meta = TYPE_META[lecture.type] ?? { icon: "•", color: "var(--muted)" };
                      const isLast = li === mod.lectures.length - 1;

                      return (
                        <div key={lecture.id} className="flex items-stretch">
                          {/* Tree line column */}
                          <div className="flex flex-col items-center" style={{ width: "52px", flexShrink: 0 }}>
                            {/* Vertical line */}
                            <div className="flex-1 w-px" style={{ background: isLast ? "transparent" : "rgba(99,120,255,0.15)", marginLeft: "25px" }} />
                            {/* Horizontal tick */}
                            <div className="flex items-center" style={{ height: "44px" }}>
                              <div className="w-4 h-px" style={{ background: "rgba(99,120,255,0.2)", marginLeft: "25px" }} />
                            </div>
                            {!isLast && <div className="flex-1 w-px" style={{ background: "rgba(99,120,255,0.15)", marginLeft: "25px" }} />}
                          </div>

                          {/* Lecture row */}
                          <div
                            className="flex-1 flex items-center gap-3 pr-4 py-2 cursor-pointer rounded-xl mr-2 transition-all hover:opacity-90"
                            style={{
                              background: isDone ? "rgba(34,211,165,0.04)" : "transparent",
                            }}
                            onClick={() => handleToggle(lecture.id)}
                          >
                            {/* Checkbox */}
                            <div className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all duration-200"
                              style={{
                                background: isDone ? "var(--green)" : "transparent",
                                border: `1.5px solid ${isDone ? "var(--green)" : "rgba(99,120,255,0.3)"}`,
                                boxShadow: isDone ? "0 0 8px rgba(34,211,165,0.4)" : "none",
                              }}>
                              {isDone && (
                                <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>

                            {/* Type icon */}
                            <div className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs"
                              style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}25` }}>
                              {meta.icon}
                            </div>

                            {/* Title + timestamp */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs leading-snug truncate transition-all"
                                style={{
                                  color: isDone ? "var(--muted)" : "var(--text)",
                                  textDecoration: isDone ? "line-through" : "none",
                                }}>
                                {lecture.title}
                              </p>
                              {isDone && ts && (
                                <p className="text-xs mt-0.5" style={{ color: "rgba(34,211,165,0.6)", fontSize: "10px" }}>
                                  ✓ {new Date(ts as number).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              )}
                            </div>

                            {/* Duration */}
                            {lecture.duration > 0 && (
                              <span className="flex-shrink-0 text-xs" style={{ color: "var(--muted)" }}>
                                {Math.floor(lecture.duration / 60)}m
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
