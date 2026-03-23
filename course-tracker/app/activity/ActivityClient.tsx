"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUser, toggleLecture } from "@/lib/store";
import ThemeToggle from "@/components/ThemeToggle";
import type { Subject } from "@/lib/courseLoader";
import type { WeekData } from "@/app/weekly/page";

interface ActivityEntry {
  lectureId: string;
  title: string;
  type: string;
  moduleName: string;
  subjectName: string;
  subjectId: string;
  moduleId: string;
  timestamp: number;
}

const TYPE_META: Record<string, { icon: string; color: string }> = {
  video:     { icon: "▶", color: "#6378ff" },
  pdf:       { icon: "📄", color: "#f59e0b" },
  liveclass: { icon: "🔴", color: "#ef4444" },
  file:      { icon: "📎", color: "#22d3a5" },
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function groupByDate(entries: ActivityEntry[]): Record<string, ActivityEntry[]> {
  const groups: Record<string, ActivityEntry[]> = {};
  for (const e of entries) {
    const key = formatDate(e.timestamp);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

export default function ActivityClient({ subjects, weeks }: { subjects: Subject[]; weeks: WeekData[] }) {
  const router = useRouter();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [completedMap, setCompletedMap] = useState<Record<string, number | false>>({});

  async function deleteEntry(lectureId: string) {
    const u = getCurrentUser();
    if (!u) return;
    await toggleLecture(u, lectureId); // toggles to false if currently done
    setCompletedMap((prev) => ({ ...prev, [lectureId]: false }));
    setEntries((prev) => prev.filter((e) => e.lectureId !== lectureId));
  }

  // Build a lookup map: lectureId -> { title, type, moduleName, subjectName, subjectId, moduleId }
  const lectureMap = new Map<string, Omit<ActivityEntry, "lectureId" | "timestamp">>();
  for (const subject of subjects) {
    for (const mod of subject.modules) {
      for (const lecture of mod.lectures) {
        lectureMap.set(lecture.id, {
          title: lecture.title,
          type: lecture.type,
          moduleName: mod.name,
          subjectName: subject.name,
          subjectId: subject.id,
          moduleId: mod.id,
        });
      }
    }
  }

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace("/"); return; }
    getUser(u).then((data) => {
      setCompletedMap(data.completedLectures);
      const result: ActivityEntry[] = [];
      for (const [id, val] of Object.entries(data.completedLectures)) {
        if (!val) continue;
        const meta = lectureMap.get(id);
        if (!meta) continue;
        result.push({ lectureId: id, timestamp: val as number, ...meta });
      }
      result.sort((a, b) => b.timestamp - a.timestamp);
      setEntries(result);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const subjectNames = ["all", ...Array.from(new Set(entries.map((e) => e.subjectName)))];
  const filtered = filter === "all" ? entries : entries.filter((e) => e.subjectName === filter);
  const grouped = groupByDate(filtered);
  const dateKeys = Object.keys(grouped);

  // Streak calculation
  function calcStreak(all: ActivityEntry[]): number {
    if (all.length === 0) return 0;
    const days = new Set(all.map((e) => new Date(e.timestamp).toDateString()));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (days.has(d.toDateString())) streak++;
      else if (i > 0) break;
    }
    return streak;
  }

  const streak = calcStreak(entries);

  // Activity heatmap — last 30 days
  const heatmap: Record<string, number> = {};
  for (const e of entries) {
    const key = new Date(e.timestamp).toDateString();
    heatmap[key] = (heatmap[key] || 0) + 1;
  }
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return { date: d, count: heatmap[d.toDateString()] || 0 };
  });

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="glow-orb w-96 h-96 -top-32 -left-32" style={{ background: "rgba(34,211,165,0.07)" }} />
      <div className="glow-orb w-64 h-64 bottom-0 -right-16" style={{ background: "rgba(99,120,255,0.06)" }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 fade-in">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm transition-all hover:opacity-80" style={{ color: "var(--muted)" }}>
              ← Dashboard
            </Link>
            <span style={{ color: "var(--border)" }}>›</span>
            <h1 className="text-lg font-bold">
              <span className="grad-text">Activity</span> Log
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/leaderboard" className="text-xs px-3 py-1.5 rounded-xl transition-all"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>
              🏆 Board
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4 fade-in-1">
          {[
            { label: "Total Done", val: entries.length, color: "var(--accent2)" },
            { label: "Day Streak 🔥", val: streak, color: "#f59e0b" },
            { label: "Today", val: heatmap[new Date().toDateString()] || 0, color: "var(--green)" },
          ].map((s) => (
            <div key={s.label} className="glass p-4 text-center">
              <div className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.val}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div className="glass p-4 mb-6 fade-in-2">
          <p className="text-xs font-semibold mb-3" style={{ color: "var(--muted)" }}>Last 30 days</p>
          <div className="flex gap-1 items-end">
            {last30.map(({ date, count }, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${date.toDateString()}: ${count}`}>
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: `${Math.max(4, Math.min(32, 4 + count * 8))}px`,
                    background: count === 0
                      ? "rgba(99,120,255,0.08)"
                      : count >= 5
                      ? "linear-gradient(180deg, #22d3a5, #6378ff)"
                      : count >= 3
                      ? "rgba(34,211,165,0.6)"
                      : "rgba(99,120,255,0.4)",
                    boxShadow: count > 0 ? "0 0 6px rgba(99,120,255,0.3)" : "none",
                  }}
                />
                {i % 7 === 0 && (
                  <span className="text-xs" style={{ color: "var(--muted)", fontSize: "9px" }}>
                    {date.getDate()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Subject filter pills */}
        <div className="flex gap-2 flex-wrap mb-5 fade-in-2">
          {subjectNames.map((name) => (
            <button
              key={name}
              onClick={() => setFilter(name)}
              className="text-xs px-3 py-1.5 rounded-full transition-all"
              style={{
                background: filter === name ? "linear-gradient(135deg, #6378ff, #8b5cf6)" : "rgba(99,120,255,0.08)",
                border: `1px solid ${filter === name ? "transparent" : "rgba(99,120,255,0.15)"}`,
                color: filter === name ? "white" : "var(--muted)",
                fontWeight: filter === name ? 600 : 400,
              }}
            >
              {name === "all" ? "All subjects" : name}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {dateKeys.length === 0 ? (
          <div className="glass p-12 text-center fade-in-3">
            <p className="text-3xl mb-3">📭</p>
            <p className="font-semibold" style={{ color: "var(--text)" }}>No activity yet</p>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Start completing lectures to see your log here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 fade-in-3">
            {dateKeys.map((dateKey) => (
              <div key={dateKey}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1" style={{ background: "rgba(99,120,255,0.12)" }} />
                  <span className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: "rgba(99,120,255,0.1)", color: "var(--accent2)", border: "1px solid rgba(99,120,255,0.2)" }}>
                    {dateKey} · {grouped[dateKey].length} done
                  </span>
                  <div className="h-px flex-1" style={{ background: "rgba(99,120,255,0.12)" }} />
                </div>

                {/* Entries */}
                <div className="flex flex-col">
                  {grouped[dateKey].map((entry, i) => {
                    const meta = TYPE_META[entry.type] ?? { icon: "•", color: "var(--muted)" };
                    const isLast = i === grouped[dateKey].length - 1;

                    return (
                      <div key={entry.lectureId} className="flex items-stretch gap-3">
                        {/* Timeline spine */}
                        <div className="flex flex-col items-center" style={{ width: "24px", flexShrink: 0 }}>
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-4"
                            style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}80` }} />
                          {!isLast && <div className="flex-1 w-px mt-1" style={{ background: "rgba(99,120,255,0.12)" }} />}
                        </div>

                        {/* Card */}
                        <div className="flex-1 mb-2 relative group">
                          <Link
                            href={`/module/${entry.moduleId}`}
                            className="glass px-4 py-3 flex items-center gap-3 hover:scale-[1.01] transition-all block"
                          >
                            <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                              style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}25` }}>
                              {meta.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate" style={{ color: "var(--text)" }}>{entry.title}</p>
                              <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                                {entry.subjectName} › {entry.moduleName}
                              </p>
                            </div>
                            <span className="flex-shrink-0 text-xs pr-6" style={{ color: "var(--muted)" }}>
                              {formatTime(entry.timestamp)}
                            </span>
                          </Link>
                          {/* Delete button */}
                          <button
                            onClick={() => deleteEntry(entry.lectureId)}
                            title="Remove from activity"
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                            style={{
                              background: "rgba(239,68,68,0.15)",
                              border: "1px solid rgba(239,68,68,0.25)",
                              color: "#ef4444",
                              fontSize: "11px",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
