"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUser, toggleLecture, deleteStudySession, deleteTestAttempt, updateTestAttempt } from "@/lib/store";
import type { StudySession, TestResult } from "@/lib/store";
import type { Subject } from "@/lib/courseLoader";
import type { WeekData } from "@/app/weekly/page";
import { 
  Flame, 
  Target, 
  Clock, 
  BookOpen, 
  TrendingUp, 
  Zap, 
  ChevronDown, 
  Activity,
  Award,
  Calendar,
  BarChart3,
  Timer,
  Hourglass
} from "lucide-react";

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
  const roundedMins = Math.round(m);
  if (roundedMins <= 0) return "0m";
  const h = Math.floor(roundedMins / 60);
  const rem = roundedMins % 60;
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
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [editingTest, setEditingTest] = useState<TestResult | null>(null);
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
      setTestResults(data.testResults ? [...data.testResults].sort((a, b) => b.timestamp - a.timestamp) : []);
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

  // Pre-calculate lecture durations for stats
  const lectureDurationMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const subject of subjects) {
      for (const mod of subject.modules) {
        for (const lecture of mod.lectures) {
          map.set(lecture.id, lecture.duration || 0);
        }
      }
    }
    return map;
  }, [subjects]);

  const totalSessionMins = studySessions.reduce((s, x) => s + x.durationMinutes, 0);
  const totalLectureMins = entries.reduce((s, e) => s + (lectureDurationMap.get(e.lectureId) || 0) / 60, 0);
  const totalStudyMins = totalLectureMins + totalSessionMins;

  function calcStreak(): number {
    if (entries.length === 0 && studySessions.length === 0) return 0;
    const lectureDays = entries.map((e) => new Date(e.timestamp).toDateString());
    const sessionDays = studySessions.map((s) => new Date(s.startedAt).toDateString());
    const days = new Set([...lectureDays, ...sessionDays]);
    
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = d.toDateString();
      if (days.has(ds)) {
        streak++;
      } else if (i === 0) {
        // Allow skip of today if yesterday has activity
        continue;
      } else {
        break;
      }
    }
    return streak;
  }

  const streak = calcStreak();
  
  // Today's stats (Lectures + Sessions)
  const todayStr = new Date().toDateString();
  const lecturesToday = entries.filter(e => new Date(e.timestamp).toDateString() === todayStr);
  const sessionsToday = studySessions.filter(s => new Date(s.startedAt).toDateString() === todayStr);
  const todayLectureMins = lecturesToday.reduce((s, e) => s + (lectureDurationMap.get(e.lectureId) || 0) / 60, 0);
  const todaySessionMins = sessionsToday.reduce((s, x) => s + x.durationMinutes, 0);
  const totalMinsToday = todayLectureMins + todaySessionMins;

  // ── High-impact analytics ───────────────────────────────────────────────
  const bestDayCount = Math.max(...Object.values(heatmap), 0);
  const bestDayKey = Object.entries(heatmap).find(([, v]) => v === bestDayCount)?.[0] ?? null;

  const hourMap: Record<number, number> = {};
  for (const s of studySessions) {
    const h = new Date(s.startedAt).getHours();
    hourMap[h] = (hourMap[h] || 0) + s.durationMinutes;
  }
  const peakHour = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0];
  const peakHourLabel = peakHour
    ? (() => { const h = parseInt(peakHour[0]); return h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`; })()
    : null;

  // 14-day split history for the unified chart
  const last14Profile = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const ds = d.toDateString();
      const dayLectures = entries.filter(e => new Date(e.timestamp).toDateString() === ds);
      const daySessions = studySessions.filter(s => new Date(s.startedAt).toDateString() === ds);
      
      // Lecture duration is in seconds in store, convert to minutes
      const lectureMins = dayLectures.reduce((s, e) => s + (lectureDurationMap.get(e.lectureId) || 0) / 60, 0);
      const sessionMins = daySessions.reduce((s, x) => s + x.durationMinutes, 0);
      
      return {
        date: d,
        sessionHours: sessionMins / 60,
        lectureHours: lectureMins / 60,
        lectureCount: dayLectures.length,
        label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      };
    });
  }, [entries, studySessions, lectureDurationMap]);

  const maxProfileHours = Math.max(...last14Profile.map(x => Math.max(x.sessionHours, x.lectureHours)), 1);

  // Lecture type breakdown
  const typeMap: Record<string, number> = {};
  for (const e of entries) typeMap[e.type] = (typeMap[e.type] || 0) + 1;
  const typeEntries = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);

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

  // Range of days and active days for averages
  const { totalRangeDays, activeDaysCount, activeSessionDaysCount, activeLectureDaysCount } = useMemo(() => {
    const lTs = entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : Infinity;
    const sTs = studySessions.length > 0 ? Math.min(...studySessions.map(s => s.startedAt)) : Infinity;
    const firstTs = Math.min(lTs, sTs);
    
    if (firstTs === Infinity) return { totalRangeDays: 0, activeDaysCount: 0, activeSessionDaysCount: 0, activeLectureDaysCount: 0 };
    
    const range = Math.max(1, Math.ceil((Date.now() - firstTs) / (86400000)));
    
    const lDays = new Set(entries.map(e => new Date(e.timestamp).toDateString()));
    const sDays = new Set(studySessions.map(s => new Date(s.startedAt).toDateString()));
    const allDays = new Set([...lDays, ...sDays]);
    
    return { 
      totalRangeDays: range, 
      activeDaysCount: allDays.size,
      activeSessionDaysCount: sDays.size,
      activeLectureDaysCount: lDays.size
    };
  }, [entries, studySessions]);

  // 24-hour distribution for all lectures
  const hourlyLectureMap = useMemo(() => {
    const map = Array(24).fill(0);
    for (const e of entries) {
      const h = new Date(e.timestamp).getHours();
      map[h]++;
    }
    return map;
  }, [entries]);
  const maxHourlyLectures = Math.max(...hourlyLectureMap, 1);

  // Test Analytics & Rank Prediction
  const testStats = useMemo(() => {
    if (!testResults || testResults.length === 0) return null;
    const percentiles = testResults.map(t => t.marksSecured / t.maxMarks);
    const avgPct = percentiles.reduce((a, b) => a + b, 0) / percentiles.length;
    const maxPct = Math.max(...percentiles);
    
    // Competitive curve: 1 + 299999 * (1 - pct)^3.5
    // This models exams where top ranks are very sensitive to small mark changes.
    const predictRank = (pct: number) => {
      const clampedPct = Math.min(1, Math.max(0, pct));
      return Math.max(1, Math.round(1 + (300000 - 1) * Math.pow(1 - clampedPct, 3.5)));
    };
    
    return {
      avgPct,
      maxPct,
      predictedRank: predictRank(avgPct),
      bestPredictedRank: predictRank(maxPct),
      percentile: (1 - (predictRank(avgPct) / 300000)) * 100,
      totalTests: testResults.length
    };
  }, [testResults]);

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

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 fade-in-1">
          {[
            { label: "Day Streak", val: `${streak}d`, icon: Flame, color: "#f59e0b", sub: "Keep it up!" },
            { label: "Today's Effort", val: fmtMins(todaySessionMins), icon: Timer, color: "var(--accent)", sub: "Active sessions" },
            { label: "Content Done", val: fmtMins(todayLectureMins), icon: BookOpen, color: "var(--green)", sub: `${lecturesToday.length} lectures today` },
            { label: "Total Content", val: fmtMins(totalLectureMins), icon: Award, color: "#8b5cf6", sub: `${entries.length} lectures total` },
          ].map((s) => (
            <div key={s.label} className="glass p-4 relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-all">
                <s.icon size={56} />
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <s.icon size={14} style={{ color: s.color }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>{s.label}</span>
              </div>
              <div className="text-xl font-black" style={{ color: "var(--text)" }}>{s.val}</div>
              <div className="text-[9px] opacity-40 font-semibold">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Unified Activity Profile (Consolidated Chart) ── */}
        <div className="glass p-5 mb-6 fade-in-2 border border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
                Activity Profile
              </p>
              <p className="text-[10px] opacity-40">Sessions (Effort) vs Content (Lectures)</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm shadow-[0_0_8px_#6366f144]" style={{ background: "#6366f1" }} />
                <span className="text-[10px] font-bold opacity-60">Study Sessions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm shadow-[0_0_8px_#f59e0b44]" style={{ background: "#f59e0b" }} />
                <span className="text-[10px] font-bold opacity-60">Lecture Content</span>
              </div>
            </div>
          </div>

          <div className="flex items-end gap-2 h-32 relative">
            {last14Profile.map((d, i) => {
              const isToday = d.date.toDateString() === todayStr;
              const sPct = (d.sessionHours / maxProfileHours) * 100;
              const lPct = (d.lectureHours / maxProfileHours) * 100;
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group/bar relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 bg-surface3 border border-border px-2.5 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all z-20 pointer-events-none shadow-2xl min-w-[90px] border-t-2"
                    style={{ borderTopColor: isToday ? "var(--accent)" : "transparent" }}>
                    <p className="text-[9px] font-black" style={{ color: "#818cf8" }}>SESSIONS: {d.sessionHours.toFixed(1)}h</p>
                    <p className="text-[9px] font-black" style={{ color: "#fbbf24" }}>LECTURES: {d.lectureHours.toFixed(1)}h</p>
                    <p className="text-[8px] opacity-40 mt-0.5">{d.lectureCount} videos done</p>
                  </div>

                  <div className="w-full flex items-end justify-center gap-[2px] h-[80%]">
                    {/* Session Bar (Left) */}
                    <div className="flex-1 rounded-t-[3px] transition-all duration-700 relative overflow-hidden"
                      style={{
                        height: `${Math.max(4, sPct)}%`,
                        background: isToday ? "#6366f1" : "rgba(99,102,241,0.25)",
                        border: isToday ? "1px solid #818cf8" : "1px solid rgba(99,102,241,0.1)",
                      }}>
                      {isToday && d.sessionHours > 0 && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                    </div>

                    {/* Lecture Bar (Right) */}
                    <div className="flex-1 rounded-t-[3px] transition-all duration-700 relative overflow-hidden"
                      style={{
                        height: `${Math.max(4, lPct)}%`,
                        background: isToday ? "#f59e0b" : "rgba(245,158,11,0.25)",
                        border: isToday ? "1px solid #fbbf24" : "1px solid rgba(245,158,11,0.1)",
                      }}>
                      {isToday && d.lectureHours > 0 && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                    </div>
                  </div>

                  {/* Label */}
                  <div className="mt-2 flex flex-col items-center">
                    <span className={`text-[8px] font-black uppercase transition-all ${isToday ? "text-accent" : "opacity-20"}`}>
                      {isToday ? "Today" : d.label.split(" ")[0]}
                    </span>
                    {isToday && <div className="w-1 h-1 rounded-full bg-accent mt-0.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Deep Insights Row (Moved from Analytics) ── */}
        <div className="grid grid-cols-2 gap-3 mb-6 fade-in-2">
          <div className="glass p-4 flex items-center gap-4">
             <div className="w-10 h-10 rounded-2xl bg-orange-400/10 flex items-center justify-center text-orange-400">
                <Zap size={20} />
             </div>
             <div>
                <p className="text-[9px] font-bold uppercase opacity-40">Best Day Ever</p>
                <p className="text-sm font-black">{bestDayCount} Lectures</p>
                <p className="text-[9px] opacity-40">{bestDayKey ? new Date(bestDayKey).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</p>
             </div>
          </div>
          <div className="glass p-4 flex items-center gap-4">
             <div className="w-10 h-10 rounded-2xl bg-purple-400/10 flex items-center justify-center text-purple-400">
                <Activity size={20} />
             </div>
             <div>
                <p className="text-[9px] font-bold uppercase opacity-40">Peak Study Hour</p>
                <p className="text-sm font-black">{peakHourLabel ?? "—"}</p>
                <p className="text-[9px] opacity-40">{peakHour ? fmtMins(peakHour[1]) + " total" : "No sessions"}</p>
             </div>
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

              // Last 14 days — daily lecture counts for stats
              const last14 = last14Profile;
              
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

              return (
                <>
                   {/* ── Performance Tracker (Test Analytics) ── */}
                   <div className="glass p-5">
                      <div className="flex items-center justify-between mb-6">
                        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
                          Performance Tracker
                        </p>
                        {testStats && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-400 border border-orange-400/20">
                            {testStats.totalTests} TESTS
                          </span>
                        )}
                      </div>

                      {testStats ? (
                        <div className="space-y-6">
                          {/* Predicted Rank */}
                          <div className="relative p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 to-purple-500/10 border border-white/5 overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10">
                               <Award size={64} />
                             </div>
                             <p className="text-[10px] font-bold uppercase opacity-50 mb-1">Estimated AIR Prediction</p>
                             <div className="flex items-baseline gap-2">
                               <h3 className="text-3xl font-black grad-text">#{testStats.predictedRank.toLocaleString()}</h3>
                               <p className="text-xs opacity-40">among 3,00,000</p>
                             </div>
                             <div className="mt-3 flex items-center gap-3">
                                <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10">
                                   <p className="text-[8px] font-bold opacity-40 uppercase">Percentile</p>
                                   <p className="text-xs font-black text-accent">{testStats.percentile.toFixed(2)}%</p>
                                </div>
                                <p className="text-[9px] opacity-60 font-medium leading-tight">
                                  Based on your performance trend. <br/>
                                  Top potential: <span className="text-white">#{testStats.bestPredictedRank.toLocaleString()}</span>
                                </p>
                             </div>
                          </div>

                          {/* Marks Stats */}
                          <div className="grid grid-cols-2 gap-3">
                             <div className="p-4 rounded-xl bg-surface2 border border-border">
                               <p className="text-[10px] opacity-40 uppercase font-bold mb-1">Average Marks</p>
                               <p className="text-xl font-black text-accent">{Math.round(testStats.avgPct * 100)}%</p>
                             </div>
                             <div className="p-4 rounded-xl bg-surface2 border border-border">
                               <p className="text-[10px] opacity-40 uppercase font-bold mb-1">Highest Score</p>
                               <p className="text-xl font-black text-green-400">{Math.round(testStats.maxPct * 100)}%</p>
                             </div>
                          </div>

                          {/* Recent Attempts */}
                          <div className="space-y-2">
                             <p className="text-[10px] font-black uppercase opacity-30 px-1">Recent Attempts</p>
                             <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                               {testResults.map((t) => (
                                 <div key={t.id} className="group flex items-center justify-between p-3 rounded-lg bg-surface2 border border-border text-[11px] hover:border-accent/30 transition-all">
                                   <div className="min-w-0 flex-1">
                                      <p className="font-bold truncate text-white/90">{t.testName}</p>
                                      <p className="opacity-40 text-[9px] font-medium">{new Date(t.timestamp).toLocaleDateString("en-IN")}</p>
                                   </div>
                                   <div className="text-right ml-4">
                                      <p className="font-black text-accent">{t.marksSecured}/{t.maxMarks}</p>
                                      <p className="text-[9px] opacity-40">Rank: {t.rank ?? "—"}/{t.rankOutOf ?? "—"}</p>
                                   </div>
                                   <div className="flex items-center gap-1 ml-4 border-l border-white/5 pl-3">
                                     <button 
                                       onClick={() => setEditingTest(t)}
                                       className="p-1.5 rounded-md hover:bg-white/5 text-muted hover:text-accent transition-all"
                                       title="Edit Attempt"
                                     >
                                       <Activity size={14} />
                                     </button>
                                     <button 
                                       onClick={async () => {
                                         if (confirm("Delete this test attempt?")) {
                                            const u = getCurrentUser();
                                            if (u) {
                                              await deleteTestAttempt(u, t.id);
                                              setTestResults(prev => prev.filter(x => x.id !== t.id));
                                            }
                                         }
                                       }}
                                       className="p-1.5 rounded-md hover:bg-white/5 text-muted hover:text-red-400 transition-all"
                                       title="Delete Attempt"
                                     >
                                       ✕
                                     </button>
                                   </div>
                                 </div>
                               ))}
                             </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-10 opacity-30">
                          <p className="text-xs font-bold uppercase tracking-widest">No Test Data Available</p>
                          <p className="text-[10px] mt-1">Mark a quiz in your weekly plan to see analytics.</p>
                        </div>
                      )}
                   </div>

                   {/* ── Consistency Metrics (Averages & Means) ── */}
                   <div className="glass p-5">
                     <div className="flex items-center justify-between mb-6">
                        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
                          Consistency Metrics
                        </p>
                        <div className="flex gap-3">
                          <div className="text-right">
                            <p className="text-[10px] font-bold opacity-30 uppercase">Total Days</p>
                            <p className="text-xs font-black">{totalRangeDays}</p>
                          </div>
                          <div className="text-right border-l border-white/5 pl-3">
                            <p className="text-[10px] font-bold text-green-400/50 uppercase">Active</p>
                            <p className="text-xs font-black text-green-400">{activeDaysCount}</p>
                          </div>
                          <div className="text-right border-l border-white/5 pl-3">
                            <p className="text-[10px] font-bold text-red-400/50 uppercase">Zero Days</p>
                            <p className="text-xs font-black text-red-400">{totalRangeDays - activeDaysCount}</p>
                          </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                       {/* Sessions Stats */}
                       <div className="space-y-3">
                         <div className="flex items-center gap-2">
                           <div className="w-1 h-3 rounded-full" style={{ background: "var(--accent)" }} />
                           <span className="text-[10px] font-bold uppercase opacity-60">Sessions</span>
                         </div>
                         <div className="p-3 rounded-xl bg-surface2 border border-border">
                           <p className="text-[10px] opacity-40 mb-1">Daily Avg (incl. Zero Days)</p>
                           <p className="text-sm font-black">{fmtMins(totalSessionMins / (totalRangeDays || 1))}</p>
                         </div>
                         <div className="p-3 rounded-xl bg-surface2 border border-border">
                           <p className="text-[10px] opacity-40 mb-1">Mean (Active Days only)</p>
                           <p className="text-sm font-black text-accent">{fmtMins(totalSessionMins / (activeSessionDaysCount || 1))}</p>
                         </div>
                       </div>

                       {/* Lectures Stats */}
                       <div className="space-y-3">
                         <div className="flex items-center gap-2">
                           <div className="w-1 h-3 rounded-full" style={{ background: "#22d3ee" }} />
                           <span className="text-[10px] font-bold uppercase opacity-60">Lectures</span>
                         </div>
                         <div className="p-3 rounded-xl bg-surface2 border border-border">
                           <p className="text-[10px] opacity-40 mb-1">Daily Avg (incl. Zero Days)</p>
                           <p className="text-sm font-black">{fmtMins(totalLectureMins / (totalRangeDays || 1))}</p>
                         </div>
                         <div className="p-3 rounded-xl bg-surface2 border border-border">
                           <p className="text-[10px] opacity-40 mb-1">Mean (Active Days only)</p>
                           <p className="text-sm font-black" style={{ color: "#22d3ee" }}>{fmtMins(totalLectureMins / (activeLectureDaysCount || 1))}</p>
                         </div>
                       </div>
                     </div>
                     <p className="text-[9px] opacity-40 text-center mt-6 uppercase tracking-wider">
                       Data analyzed from first log to today
                     </p>
                   </div>

                   {/* ── 24-Hour Activity Distribution (Hourly Heatmap) ── */}
                   <div className="glass p-5">
                     <p className="text-xs font-black uppercase tracking-[0.2em] mb-6" style={{ color: "var(--muted)" }}>
                       Activity Distribution
                     </p>
                     <div className="flex flex-col gap-4">
                       <div className="flex items-end gap-[2px] h-24">
                         {hourlyLectureMap.map((count, h) => {
                           const pct = (count / maxHourlyLectures) * 100;
                           const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h-12} PM`;
                           
                           // Color based on time of day
                           let barColor = "var(--accent)";
                           if (h >= 0 && h < 6) barColor = "#6366f1"; // Night - Indigo
                           else if (h >= 6 && h < 12) barColor = "#f59e0b"; // Morning - Amber
                           else if (h >= 12 && h < 18) barColor = "#ef4444"; // Afternoon - Red/Orange
                           else barColor = "#a855f7"; // Evening - Purple

                           return (
                             <div key={h} className="flex-1 flex flex-col items-center justify-end h-full group/h relative">
                               <div className="absolute -top-10 bg-surface3 border border-border px-2 py-1 rounded text-[9px] font-black opacity-0 group-hover/h:opacity-100 transition-all z-10 pointer-events-none whitespace-nowrap shadow-xl">
                                 <span style={{ color: barColor }}>{label}</span>: {count} lec
                               </div>
                               <div className="w-full rounded-t-[2px] transition-all duration-700"
                                 style={{ 
                                   height: `${Math.max(8, pct)}%`, 
                                   background: count > 0 ? barColor : "var(--surface2)",
                                   opacity: count > 0 ? 0.4 + (pct/100)*0.6 : 0.15,
                                   boxShadow: count > 0 ? `0 0 10px ${barColor}22` : "none"
                                 }} />
                             </div>
                           );
                         })}
                       </div>
                       <div className="flex justify-between text-[7px] font-black uppercase opacity-40 px-0.5 mt-1">
                         {["12A", "3A", "6A", "9A", "12P", "3P", "6P", "9P", "11P"].map(t => <span key={t}>{t}</span>)}
                       </div>
                       
                       <div className="flex items-center justify-center gap-4 mt-2">
                         {[
                           { l: "Night", c: "#6366f1" },
                           { l: "Morning", c: "#f59e0b" },
                           { l: "Afternoon", c: "#ef4444" },
                           { l: "Evening", c: "#a855f7" }
                         ].map(k => (
                           <div key={k.l} className="flex items-center gap-1.5">
                             <div className="w-1.5 h-1.5 rounded-full" style={{ background: k.c }} />
                             <span className="text-[8px] font-bold uppercase opacity-40">{k.l}</span>
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>

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

                  {/* Trend charts are now on the main Activity tab for better visibility */}

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

                  {/* Subjects and Types mix remain here for deep analysis */}

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
      {/* ── Edit Test Modal ── */}
      {editingTest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingTest(null)} />
          <div className="relative w-full max-w-md glass p-6 rounded-2xl shadow-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent text-2xl">📝</div>
              <div>
                <h3 className="text-lg font-black">Edit Test Result</h3>
                <p className="text-xs opacity-50 uppercase font-bold tracking-wider truncate max-w-[250px]">{editingTest.testName}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase opacity-40">Max Marks</label>
                  <input
                    type="number"
                    value={editingTest.maxMarks}
                    onChange={(e) => setEditingTest({ ...editingTest, maxMarks: parseFloat(e.target.value) })}
                    className="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:border-accent outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase opacity-40">Marks Secured</label>
                  <input
                    type="number"
                    value={editingTest.marksSecured}
                    onChange={(e) => setEditingTest({ ...editingTest, marksSecured: parseFloat(e.target.value) })}
                    className="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:border-accent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase opacity-40">Rank</label>
                  <input
                    type="number"
                    value={editingTest.rank || ""}
                    onChange={(e) => setEditingTest({ ...editingTest, rank: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:border-accent outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase opacity-40">Rank Out Of</label>
                  <input
                    type="number"
                    value={editingTest.rankOutOf || ""}
                    onChange={(e) => setEditingTest({ ...editingTest, rankOutOf: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:border-accent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setEditingTest(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-surface2 border border-border text-sm font-bold hover:bg-surface3 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const u = getCurrentUser();
                    if (u && editingTest) {
                      await updateTestAttempt(u, editingTest);
                      setTestResults(prev => prev.map(t => t.id === editingTest.id ? editingTest : t));
                      setEditingTest(null);
                    }
                  }}
                  className="flex-[2] px-4 py-3 rounded-xl bg-accent text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
