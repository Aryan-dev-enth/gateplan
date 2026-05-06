"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUser, toggleLecture, deleteStudySession } from "@/lib/store";
import type { StudySession } from "@/lib/store";
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

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function fmtMins(m: number) {
  if (m <= 0) return "0m";
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

function groupByDate<T extends { timestamp?: number; startedAt?: number }>(
  items: T[], key: "timestamp" | "startedAt"
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const ts = item[key] as number;
    const k = fmtDate(ts);
    if (!groups[k]) groups[k] = [];
    groups[k].push(item);
  }
  return groups;
}

export default function ActivityClient({ subjects, weeks }: { subjects: Subject[]; weeks: WeekData[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [completedMap, setCompletedMap] = useState<Record<string, number | false>>({});
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [activeTab, setActiveTab] = useState<"lectures" | "sessions" | "analytics">(
    searchParams.get("tab") === "sessions" ? "sessions" :
    searchParams.get("tab") === "analytics" ? "analytics" : "lectures"
  );
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const todayKey = fmtDate(Date.now());

  function toggleDay(key: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function isDayOpen(key: string) {
    // today is open by default unless explicitly closed
    if (key === todayKey) return !expandedDays.has("__closed__" + key);
    return expandedDays.has(key);
  }

  function handleDayToggle(key: string) {
    if (key === todayKey) {
      // today: toggle a "closed" marker
      setExpandedDays((prev) => {
        const next = new Set(prev);
        const closedKey = "__closed__" + key;
        if (next.has(closedKey)) next.delete(closedKey);
        else next.add(closedKey);
        return next;
      });
    } else {
      toggleDay(key);
    }
  }

  // Build lectureId → meta map
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
      setStudySessions((data.studySessions ?? []).slice().sort((a, b) => b.startedAt - a.startedAt));
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

  async function deleteEntry(lectureId: string) {
    const u = getCurrentUser();
    if (!u) return;
    await toggleLecture(u, lectureId);
    setCompletedMap((prev) => ({ ...prev, [lectureId]: false }));
    setEntries((prev) => prev.filter((e) => e.lectureId !== lectureId));
  }

  async function handleDeleteSession(sessionId: string) {
    const u = getCurrentUser();
    if (!u) return;
    const s = studySessions.find(x => x.id === sessionId);
    const label = s ? `${fmtMins(s.durationMinutes)} session for ${s.subjectName}` : "this session";
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    await deleteStudySession(u, sessionId);
    setStudySessions((prev) => prev.filter((x) => x.id !== sessionId));
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const heatmap: Record<string, number> = {};
  for (const e of entries) {
    const k = new Date(e.timestamp).toDateString();
    heatmap[k] = (heatmap[k] || 0) + 1;
  }

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return { date: d, count: heatmap[d.toDateString()] || 0 };
  });

  function calcStreak(): number {
    if (entries.length === 0) return 0;
    const days = new Set(entries.map((e) => new Date(e.timestamp).toDateString()));
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

  const streak = calcStreak();
  const todayCount = heatmap[new Date().toDateString()] || 0;
  const totalSessionMins = studySessions.reduce((s, x) => s + x.durationMinutes, 0);

  // Subject breakdown for analytics
  const subjectStats = (() => {
    const map = new Map<string, { lectures: number; minutes: number }>();
    for (const e of entries) {
      const cur = map.get(e.subjectName) ?? { lectures: 0, minutes: 0 };
      cur.lectures += 1;
      map.set(e.subjectName, cur);
    }
    for (const s of studySessions) {
      const cur = map.get(s.subjectName) ?? { lectures: 0, minutes: 0 };
      cur.minutes += s.durationMinutes;
      map.set(s.subjectName, cur);
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.lectures - a.lectures);
  })();

  // Weekly pattern from sessions (Mon–Sun)
  const weeklyMins = Array(7).fill(0);
  for (const s of studySessions) {
    weeklyMins[new Date(s.startedAt).getDay()] += s.durationMinutes;
  }
  const maxWeeklyMins = Math.max(...weeklyMins, 1);
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Filtered lecture list
  const subjectNames = ["all", ...Array.from(new Set(entries.map((e) => e.subjectName)))];
  const filtered = filter === "all" ? entries : entries.filter((e) => e.subjectName === filter);
  const grouped = groupByDate(filtered, "timestamp");
  const dateKeys = Object.keys(grouped);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="mb-6 fade-in">
          <h1 className="text-base font-bold">
            <span className="grad-text">Activity</span>
            <span style={{ color: "var(--text)" }}> Log</span>
          </h1>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-4 gap-3 mb-5 fade-in-1">
          {[
            { label: "Lectures done", val: entries.length, color: "var(--accent)" },
            { label: "Day streak", val: `${streak} 🔥`, color: "#f59e0b" },
            { label: "Today", val: todayCount, color: "var(--green)" },
            { label: "Study time", val: fmtMins(totalSessionMins), color: "#8b5cf6" },
          ].map((s) => (
            <div key={s.label} className="glass p-4 text-center">
              <div className="text-xl font-bold mb-1" style={{ color: s.color }}>{s.val}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Heatmap ── */}
        <div className="glass p-4 mb-5 fade-in-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
            Last 30 days
          </p>
          <div className="flex gap-1 items-end">
            {last30.map(({ date, count }, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1"
                title={`${date.toDateString()}: ${count} lecture${count !== 1 ? "s" : ""}`}>
                <div className="w-full rounded-sm transition-all"
                  style={{
                    height: `${Math.max(4, Math.min(32, 4 + count * 7))}px`,
                    background: count === 0
                      ? "var(--surface2)"
                      : count >= 5
                      ? "linear-gradient(180deg, var(--green), var(--accent))"
                      : count >= 3
                      ? "rgba(34,211,165,0.6)"
                      : "var(--tint-accent)",
                    border: "1px solid var(--border)",
                  }} />
                {i % 7 === 0 && (
                  <span style={{ color: "var(--muted)", fontSize: "9px" }}>{date.getDate()}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl fade-in-2"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          {(["lectures", "sessions", "analytics"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex-1 text-xs py-2 rounded-lg font-semibold transition-all"
              style={{
                background: activeTab === tab ? "var(--accent)" : "transparent",
                color: activeTab === tab ? "white" : "var(--muted)",
              }}>
              {tab === "lectures" ? "Lectures" : tab === "sessions" ? "Sessions" : "Analytics"}
            </button>
          ))}
        </div>

        {/* ── Lectures tab ── */}
        {activeTab === "lectures" && (
          <>
            {/* Subject filter */}
            <div className="flex gap-2 flex-wrap mb-4 fade-in-2">
              {subjectNames.map((name) => (
                <button key={name} onClick={() => setFilter(name)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{
                    background: filter === name ? "var(--accent)" : "var(--surface2)",
                    border: `1px solid ${filter === name ? "transparent" : "var(--border)"}`,
                    color: filter === name ? "white" : "var(--muted)",
                    fontWeight: filter === name ? 600 : 400,
                  }}>
                  {name === "all" ? "All" : name}
                </button>
              ))}
            </div>

            {dateKeys.length === 0 ? (
              <div className="glass p-12 text-center fade-in-3">
                <p className="text-3xl mb-3">📭</p>
                <p className="font-semibold" style={{ color: "var(--text)" }}>No activity yet</p>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  Start completing lectures to see your log here
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 fade-in-3">
                {dateKeys.map((dateKey) => {
                  const open = isDayOpen(dateKey);
                  const isToday = dateKey === todayKey;
                  const items = grouped[dateKey];
                  return (
                    <div key={dateKey} className="rounded-xl overflow-hidden"
                      style={{ border: `1px solid ${isToday ? "var(--accent)" : "var(--border)"}` }}>
                      {/* Day header — always visible, clickable */}
                      <button
                        onClick={() => handleDayToggle(dateKey)}
                        className="w-full flex items-center justify-between px-4 py-3 transition-all hover:opacity-90"
                        style={{
                          background: isToday ? "var(--today-header-bg)" : "var(--surface2)",
                        }}>
                        <div className="flex items-center gap-2">
                          {isToday && (
                            <span className="w-1.5 h-1.5 rounded-full pulse-dot flex-shrink-0"
                              style={{ background: "var(--accent)" }} />
                          )}
                          <span className="text-sm font-semibold" style={{ color: isToday ? "var(--accent)" : "var(--text)" }}>
                            {isToday ? "Today" : dateKey}
                          </span>
                          {isToday && (
                            <span className="text-xs" style={{ color: "var(--muted)" }}>{dateKey}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "var(--tint-accent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                            {items.length} lecture{items.length !== 1 ? "s" : ""}
                          </span>
                          <svg style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--muted)" }}
                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </button>

                      {/* Items — only rendered when open */}
                      {open && (
                        <div className="flex flex-col gap-2 p-2"
                          style={{ background: "var(--card-bg)", borderTop: "1px solid var(--border)" }}>
                          
                          {/* Daily Summary - Subject & Module wise hours */}
                          {(() => {
                            // Build duration map from subjects
                            const durationMap = new Map<string, number>();
                            for (const subject of subjects) {
                              for (const mod of subject.modules) {
                                for (const lecture of mod.lectures) {
                                  durationMap.set(lecture.id, lecture.duration || 0);
                                }
                              }
                            }

                            // Calculate hours by subject and module for this day
                            const subjectModuleHours: Record<string, Record<string, number>> = {};
                            
                            items.forEach((entry) => {
                              const duration = durationMap.get(entry.lectureId) || 0;
                              const hours = duration / 3600;
                              
                              if (!subjectModuleHours[entry.subjectName]) {
                                subjectModuleHours[entry.subjectName] = {};
                              }
                              
                              if (!subjectModuleHours[entry.subjectName][entry.moduleName]) {
                                subjectModuleHours[entry.subjectName][entry.moduleName] = 0;
                              }
                              
                              subjectModuleHours[entry.subjectName][entry.moduleName] += hours;
                            });

                            const totalDayHours = Object.values(subjectModuleHours).reduce(
                              (sum, modules) => sum + Object.values(modules).reduce((s, h) => s + h, 0),
                              0
                            );

                            const SUBJECT_COLORS: Record<string, string> = {
                              "Engineering Mathematics": "#6378ff",
                              "Discrete Mathematics": "#22d3a5",
                              "Aptitude": "#f59e0b",
                              "Operating Systems": "#f97316",
                              "Computer Networks": "#06b6d4",
                              "DBMS": "#a78bfa",
                              "Algorithms": "#34d399",
                              "Theory of Computation": "#fb7185",
                              "Digital Logic": "#fbbf24",
                              "COA": "#60a5fa",
                            };

                            const getSubjectColor = (name: string) => {
                              for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
                                if (name.toLowerCase().includes(key.toLowerCase())) return color;
                              }
                              return "#8b5cf6";
                            };

                            return (
                              <div className="mb-2 p-3 rounded-xl" 
                                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                                <div className="flex items-center justify-between mb-3">
                                  <p className="text-xs font-bold uppercase tracking-wider" 
                                    style={{ color: "var(--muted)" }}>
                                    📊 Daily Summary
                                  </p>
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: "var(--tint-accent)", color: "var(--accent)" }}>
                                    {totalDayHours.toFixed(1)}h total
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  {Object.entries(subjectModuleHours).map(([subject, modules]) => {
                                    const subjectTotal = Object.values(modules).reduce((s, h) => s + h, 0);
                                    const subjectColor = getSubjectColor(subject);
                                    
                                    return (
                                      <div key={subject} className="space-y-1">
                                        {/* Subject header */}
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <div className="w-1 h-4 rounded-full" 
                                              style={{ background: subjectColor }} />
                                            <span className="text-xs font-semibold" 
                                              style={{ color: subjectColor }}>
                                              {subject}
                                            </span>
                                          </div>
                                          <span className="text-xs font-bold" 
                                            style={{ color: subjectColor }}>
                                            {subjectTotal.toFixed(1)}h
                                          </span>
                                        </div>

                                        {/* Modules breakdown */}
                                        <div className="pl-4 space-y-1">
                                          {Object.entries(modules).map(([module, hours]) => (
                                            <div key={module} 
                                              className="flex items-center justify-between py-1 px-2 rounded"
                                              style={{ background: "var(--surface2)" }}>
                                              <span className="text-xs truncate flex-1" 
                                                style={{ color: "var(--text)" }}>
                                                {module}
                                              </span>
                                              <span className="text-xs font-semibold ml-2" 
                                                style={{ color: "var(--muted)" }}>
                                                {hours.toFixed(1)}h
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Lecture items */}
                          <div className="space-y-1">
                            {items.map((entry) => {
                              const meta = TYPE_META[entry.type] ?? { icon: "•", color: "var(--muted)" };
                              return (
                                <div key={entry.lectureId} className="group relative">
                                  <Link href={`/module/${entry.moduleId}`}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:opacity-90 transition-all"
                                    style={{ background: "var(--surface2)" }}>
                                    <div className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs"
                                      style={{ background: `${meta.color}18`, color: meta.color }}>
                                      {meta.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs truncate" style={{ color: "var(--text)" }}>{entry.title}</p>
                                      <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                                        {entry.subjectName} · {entry.moduleName}
                                      </p>
                                    </div>
                                    <span className="flex-shrink-0 text-xs pr-7" style={{ color: "var(--muted)" }}>
                                      {fmtTime(entry.timestamp)}
                                    </span>
                                  </Link>
                                  <button onClick={() => deleteEntry(entry.lectureId)}
                                    title="Remove"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                    style={{ background: "rgba(239,68,68,0.12)", color: "var(--red)", fontSize: "11px" }}>
                                    ✕
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Sessions tab ── */}
        {activeTab === "sessions" && (
          <div className="fade-in-3">
            {studySessions.length === 0 ? (
              <div className="glass p-12 text-center">
                <p className="text-3xl mb-3">⏱</p>
                <p className="font-semibold" style={{ color: "var(--text)" }}>No sessions logged yet</p>
                <p className="text-sm mt-1 mb-4" style={{ color: "var(--muted)" }}>
                  Use Log Time to record your study sessions
                </p>
                <Link href="/log-time"
                  className="btn-primary px-5 py-2 rounded-xl text-sm inline-block">
                  Log Time
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.entries(groupByDate(studySessions, "startedAt")).map(([dateKey, sessions]) => {
                  const open = isDayOpen("s_" + dateKey);
                  const isToday = dateKey === todayKey;
                  const totalMins = sessions.reduce((s, x) => s + x.durationMinutes, 0);
                  return (
                    <div key={dateKey} className="rounded-xl overflow-hidden"
                      style={{ border: `1px solid ${isToday ? "var(--accent)" : "var(--border)"}` }}>
                      <button
                        onClick={() => {
                          const k = "s_" + dateKey;
                          if (isToday) {
                            setExpandedDays((prev) => {
                              const next = new Set(prev);
                              const ck = "__closed__" + k;
                              if (next.has(ck)) next.delete(ck); else next.add(ck);
                              return next;
                            });
                          } else {
                            toggleDay(k);
                          }
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 transition-all hover:opacity-90"
                        style={{ background: isToday ? "var(--today-header-bg)" : "var(--surface2)" }}>
                        <div className="flex items-center gap-2">
                          {isToday && <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--accent)" }} />}
                          <span className="text-sm font-semibold" style={{ color: isToday ? "var(--accent)" : "var(--text)" }}>
                            {isToday ? "Today" : dateKey}
                          </span>
                          {isToday && <span className="text-xs" style={{ color: "var(--muted)" }}>{dateKey}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "var(--tint-accent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                            {fmtMins(totalMins)}
                          </span>
                          <svg style={{ transform: (isToday ? !expandedDays.has("__closed__s_" + dateKey) : expandedDays.has("s_" + dateKey)) ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--muted)" }}
                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </button>

                      {(isToday ? !expandedDays.has("__closed__s_" + dateKey) : expandedDays.has("s_" + dateKey)) && (
                        <div className="flex flex-col gap-1 p-2"
                          style={{ background: "var(--card-bg)", borderTop: "1px solid var(--border)" }}>
                          {sessions.map((s) => (
                            <div key={s.id} className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg"
                              style={{ background: "var(--surface2)" }}>
                              <div className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs"
                                style={{ background: "var(--tint-accent)", color: "var(--accent)" }}>
                                ⏱
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{s.subjectName}</p>
                                {s.moduleName && <p className="text-xs truncate" style={{ color: "var(--accent)" }}>{s.moduleName}</p>}
                                {s.note && <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{s.note}</p>}
                                <p className="text-xs" style={{ color: "var(--muted)" }}>{fmtTime(s.startedAt)}</p>
                              </div>
                              <span className="text-xs font-bold pr-7" style={{ color: "var(--green)" }}>
                                {fmtMins(s.durationMinutes)}
                              </span>
                              <button onClick={() => handleDeleteSession(s.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                style={{ background: "rgba(239,68,68,0.12)", color: "var(--red)", fontSize: "11px" }}>
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Analytics tab ── */}
        {activeTab === "analytics" && (
          <div className="flex flex-col gap-4 fade-in-3">

            {entries.length === 0 && studySessions.length === 0 ? (
              <div className="glass p-10 text-center">
                <p className="text-sm" style={{ color: "var(--muted)" }}>Complete lectures or log sessions to see analytics</p>
              </div>
            ) : (() => {
              // ── Compute all analytics inline ──────────────────────────────

              // Last 14 days — daily lecture counts
              const last14 = Array.from({ length: 14 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (13 - i));
                return { date: d, lectures: heatmap[d.toDateString()] || 0 };
              });
              const max14 = Math.max(...last14.map(x => x.lectures), 1);

              // This week vs last week (lectures)
              const now = new Date();
              const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - now.getDay()); thisWeekStart.setHours(0,0,0,0);
              const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(thisWeekStart.getDate() - 7);
              const thisWeekLectures = entries.filter(e => e.timestamp >= thisWeekStart.getTime()).length;
              const lastWeekLectures = entries.filter(e => e.timestamp >= lastWeekStart.getTime() && e.timestamp < thisWeekStart.getTime()).length;
              const weekDelta = lastWeekLectures > 0 ? Math.round(((thisWeekLectures - lastWeekLectures) / lastWeekLectures) * 100) : null;

              // This week vs last week (session mins)
              const thisWeekMins = studySessions.filter(s => s.startedAt >= thisWeekStart.getTime()).reduce((a, s) => a + s.durationMinutes, 0);
              const lastWeekMins = studySessions.filter(s => s.startedAt >= lastWeekStart.getTime() && s.startedAt < thisWeekStart.getTime()).reduce((a, s) => a + s.durationMinutes, 0);
              const minsDelta = lastWeekMins > 0 ? Math.round(((thisWeekMins - lastWeekMins) / lastWeekMins) * 100) : null;

              // Daily avg (last 14 active days)
              const activeDays14 = last14.filter(x => x.lectures > 0).length;
              const avgLectures14 = activeDays14 > 0 ? (last14.reduce((a, x) => a + x.lectures, 0) / activeDays14).toFixed(1) : "—";

              // Best single day ever
              const bestDayCount = Math.max(...Object.values(heatmap), 0);
              const bestDayKey = Object.entries(heatmap).find(([, v]) => v === bestDayCount)?.[0] ?? null;

              // Lecture type breakdown
              const typeMap: Record<string, number> = {};
              for (const e of entries) typeMap[e.type] = (typeMap[e.type] || 0) + 1;
              const typeEntries = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);

              // Study time by hour of day (from sessions)
              const hourMap: Record<number, number> = {};
              for (const s of studySessions) {
                const h = new Date(s.startedAt).getHours();
                hourMap[h] = (hourMap[h] || 0) + s.durationMinutes;
              }
              const peakHour = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0];
              const peakHourLabel = peakHour
                ? (() => { const h = parseInt(peakHour[0]); return h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`; })()
                : null;

              return (
                <>
                  {/* ── This week vs last week ── */}
                  <div className="glass p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
                      This week vs last week
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          label: "Lectures",
                          thisVal: thisWeekLectures,
                          lastVal: lastWeekLectures,
                          delta: weekDelta,
                          color: "var(--accent)",
                        },
                        {
                          label: "Study time",
                          thisVal: fmtMins(thisWeekMins),
                          lastVal: fmtMins(lastWeekMins),
                          delta: minsDelta,
                          color: "#8b5cf6",
                        },
                      ].map(({ label, thisVal, lastVal, delta, color }) => (
                        <div key={label} className="rounded-xl p-3"
                          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                          <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>{label}</p>
                          <p className="text-xl font-bold" style={{ color }}>{thisVal}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs" style={{ color: "var(--muted)" }}>Last: {lastVal}</span>
                            {delta !== null && (
                              <span className="text-xs font-semibold"
                                style={{ color: delta >= 0 ? "var(--green)" : "var(--red)" }}>
                                {delta >= 0 ? "+" : ""}{delta}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── 14-day study time trend (from sessions) ── */}
                  {(() => {
                    const last14mins = Array.from({ length: 14 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (13 - i));
                      const dayMins = studySessions
                        .filter(s => new Date(s.startedAt).toDateString() === d.toDateString())
                        .reduce((a, s) => a + s.durationMinutes, 0);
                      return { date: d, mins: dayMins };
                    });
                    const maxMins = Math.max(...last14mins.map(x => x.mins), 1);
                    const activeDaysTime = last14mins.filter(x => x.mins > 0).length;
                    const avgMins = activeDaysTime > 0
                      ? Math.round(last14mins.reduce((a, x) => a + x.mins, 0) / activeDaysTime)
                      : 0;

                    if (studySessions.length === 0) return null;

                    return (
                      <div className="glass p-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                            Daily study time — last 14 days
                          </p>
                          <span className="text-xs" style={{ color: "var(--muted)" }}>
                            avg {fmtMins(avgMins)}/active day
                          </span>
                        </div>
                        <div className="flex items-end gap-1.5" style={{ height: "100px" }}>
                          {last14mins.map(({ date, mins }, i) => {
                            const isToday = date.toDateString() === new Date().toDateString();
                            const pct = mins > 0 ? Math.max(0.2, mins / maxMins) : 0;
                            const barH = Math.round(pct * 80);
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5"
                                style={{ height: "100px" }}
                                title={`${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}: ${fmtMins(mins)}`}>
                                <span style={{
                                  fontSize: "9px", fontWeight: 600, lineHeight: 1,
                                  color: mins > 0 ? (isToday ? "var(--accent)" : "var(--text)") : "transparent",
                                }}>
                                  {mins > 0 ? (mins >= 60 ? `${Math.floor(mins/60)}h` : `${mins}m`) : "·"}
                                </span>
                                <div className="w-full rounded-t-md transition-all duration-500"
                                  style={{
                                    height: mins > 0 ? `${barH}px` : "3px",
                                    background: isToday
                                      ? "linear-gradient(180deg, var(--accent), var(--accent2))"
                                      : mins >= maxMins * 0.7
                                      ? "linear-gradient(180deg, #8b5cf6, #6378ff)"
                                      : mins > 0 ? "rgba(139,92,246,0.25)" : "var(--surface2)",
                                    border: `1px solid ${isToday ? "var(--accent)" : mins > 0 ? "rgba(139,92,246,0.3)" : "var(--border)"}`,
                                    opacity: mins === 0 ? 0.4 : 1,
                                  }} />
                                <span style={{
                                  fontSize: "9px", lineHeight: 1,
                                  color: isToday ? "var(--accent)" : "var(--muted)",
                                  fontWeight: isToday ? 700 : 400,
                                }}>
                                  {isToday ? "now" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }).replace(" ", "\u00A0")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Subject breakdown — donut ── */}
                  {subjectStats.length > 0 && (() => {
                    const COLORS = ["#6378ff","#22d3a5","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
                    const totalLectures = subjectStats.reduce((a, s) => a + s.lectures, 0);
                    // Top 5 + others
                    const top = subjectStats.slice(0, 5);
                    const othersLec = subjectStats.slice(5).reduce((a, s) => a + s.lectures, 0);
                    const slices = othersLec > 0
                      ? [...top, { name: "Others", lectures: othersLec, minutes: 0 }]
                      : top;

                    // Build donut path segments
                    const R = 44; const r = 26; const cx = 50; const cy = 50;
                    let angle = -90;
                    const segments = slices.map((s, i) => {
                      const pct = s.lectures / totalLectures;
                      const sweep = pct * 360;
                      const a1 = (angle * Math.PI) / 180;
                      const a2 = ((angle + sweep) * Math.PI) / 180;
                      const x1o = cx + R * Math.cos(a1); const y1o = cy + R * Math.sin(a1);
                      const x2o = cx + R * Math.cos(a2); const y2o = cy + R * Math.sin(a2);
                      const x1i = cx + r * Math.cos(a1); const y1i = cy + r * Math.sin(a1);
                      const x2i = cx + r * Math.cos(a2); const y2i = cy + r * Math.sin(a2);
                      const large = sweep > 180 ? 1 : 0;
                      const path = `M${x1o},${y1o} A${R},${R} 0 ${large} 1 ${x2o},${y2o} L${x2i},${y2i} A${r},${r} 0 ${large} 0 ${x1i},${y1i} Z`;
                      angle += sweep;
                      return { ...s, path, color: COLORS[i % COLORS.length], pct: Math.round(pct * 100) };
                    });

                    return (
                      <div className="glass p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--muted)" }}>
                          Subject breakdown
                        </p>
                        <div className="flex items-center gap-5">
                          {/* Donut */}
                          <div className="flex-shrink-0">
                            <svg width="110" height="110" viewBox="0 0 100 100">
                              {segments.map((seg, i) => (
                                <path key={i} d={seg.path} fill={seg.color} opacity={0.9} />
                              ))}
                              {/* Center label */}
                              <text x="50" y="47" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text)">{totalLectures}</text>
                              <text x="50" y="57" textAnchor="middle" fontSize="7" fill="var(--muted)">lectures</text>
                            </svg>
                          </div>
                          {/* Legend */}
                          <div className="flex-1 flex flex-col gap-2 min-w-0">
                            {segments.map((seg) => (
                              <div key={seg.name} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: seg.color }} />
                                <span className="text-xs truncate flex-1" style={{ color: "var(--text)" }}>{seg.name}</span>
                                <span className="text-xs font-semibold flex-shrink-0" style={{ color: seg.color }}>{seg.pct}%</span>
                                <span className="text-xs flex-shrink-0" style={{ color: "var(--muted)" }}>{seg.lectures}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Quick facts row ── */}
                  <div className="glass p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
                      Quick facts
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Best day ever", val: bestDayCount > 0 ? `${bestDayCount} lectures` : "—", sub: bestDayKey ? new Date(bestDayKey).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "" },
                        { label: "Peak study hour", val: peakHourLabel ?? "—", sub: peakHour ? fmtMins(peakHour[1]) + " total" : "" },
                        ...(studySessions.length > 0 ? [
                          { label: "Avg session", val: fmtMins(Math.round(totalSessionMins / studySessions.length)), sub: `${studySessions.length} sessions total` },
                          { label: "Longest session", val: fmtMins(Math.max(...studySessions.map(s => s.durationMinutes))), sub: "" },
                        ] : []),
                      ].map(({ label, val, sub }) => (
                        <div key={label} className="rounded-xl px-3 py-2.5"
                          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                          <p className="text-xs" style={{ color: "var(--muted)" }}>{label}</p>
                          <p className="text-sm font-bold mt-0.5" style={{ color: "var(--text)" }}>{val}</p>
                          {sub && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Lecture type mix ── */}
                  {typeEntries.length > 1 && (
                    <div className="glass p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
                        Content type mix
                      </p>
                      <div className="flex flex-col gap-2">
                        {typeEntries.map(([type, count]) => {
                          const meta = TYPE_META[type] ?? { icon: "•", color: "var(--muted)" };
                          const pct = Math.round((count / entries.length) * 100);
                          return (
                            <div key={type} className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0"
                                style={{ background: `${meta.color}18`, color: meta.color }}>
                                {meta.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs capitalize" style={{ color: "var(--text)" }}>{type}</span>
                                  <span className="text-xs font-semibold" style={{ color: meta.color }}>{count} ({pct}%)</span>
                                </div>
                                <div className="h-1 rounded-full" style={{ background: "var(--surface2)" }}>
                                  <div className="h-1 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, background: meta.color }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
