"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUser } from "@/lib/store";
import ThemeToggle from "@/components/ThemeToggle";
import GOClassesScheduleDropdown from "@/components/GOClassesScheduleDropdown";
import type { Subject } from "@/lib/courseLoader";
import type { WeekData, DayData, TaskData } from "./page";

const SUBJECT_COLORS: Record<string, [string, string]> = {
  "Engineering Mathematics": ["#6378ff", "#a78bfa"],
  "Discrete Mathematics":    ["#22d3a5", "#6378ff"],
  "Fundamentals (Aptitude)": ["#f59e0b", "#ef4444"],
  "Linear Algebra":          ["#6378ff", "#a78bfa"],
};

function getSubjectColor(subject: string): [string, string] {
  for (const key of Object.keys(SUBJECT_COLORS)) {
    if (subject.toLowerCase().includes(key.toLowerCase())) return SUBJECT_COLORS[key];
  }
  return ["#8b5cf6", "#06b6d4"];
}

function isToday(dateStr: string) {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

function isPast(dateStr: string) {
  return new Date(dateStr) < new Date(new Date().toDateString());
}

function TaskCard({
  task,
  completedMap,
  moduleId,
}: {
  task: TaskData;
  completedMap: Record<string, number | false>;
  moduleId: string | undefined;
}) {
  const [c1, c2] = getSubjectColor(task.subject);
  const mappedCount = task.lectureIds.length;
  const doneCount = task.lectureIds.filter((id) => !!completedMap[id]).length;
  const hasMapped = mappedCount > 0;
  const allDone = hasMapped && doneCount === mappedCount;
  const pct = hasMapped ? Math.round((doneCount / mappedCount) * 100) : null;

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3 transition-all"
      style={{
        background: allDone ? "var(--tint-green)" : "var(--card-bg)",
        border: `1px solid ${allDone ? "var(--tint-green-border)" : "var(--border)"}`,
      }}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ background: `linear-gradient(180deg, ${c1}, ${c2})` }} />
        <div className="flex-1 min-w-0">
          {/* Subject + module — links to exact module page */}
          {moduleId ? (
            <Link href={`/module/${moduleId}`}
              className="text-sm font-semibold hover:underline underline-offset-2 block truncate"
              style={{ color: c1 }}
              onClick={(e) => e.stopPropagation()}>
              {task.subject} ↗
            </Link>
          ) : (
            <p className="text-sm font-semibold truncate" style={{ color: c1 }}>{task.subject}</p>
          )}
          {moduleId ? (
            <Link href={`/module/${moduleId}`}
              className="text-xs mt-0.5 truncate block hover:underline underline-offset-2"
              style={{ color: "var(--muted)" }}
              onClick={(e) => e.stopPropagation()}>
              {task.module}
            </Link>
          ) : (
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>{task.module}</p>
          )}
        </div>
        <span className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg"
          style={{ background: `${c1}22`, color: c1 }}>
          {Number.isInteger(task.hours) ? task.hours : task.hours.toFixed(2).replace(/\.?0+$/, "")}h
        </span>
      </div>

      {/* Lecture tags */}
      <div className="flex flex-wrap gap-1.5">
        {task.lectureRefs.map((ref, i) => {
          const id = task.lectureIds[i];
          const done = id ? !!completedMap[id] : false;
          return (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full transition-all"
              style={{
                background: done ? "var(--tint-green)" : "var(--tint-accent)",
                border: `1px solid ${done ? "var(--tint-green-border)" : "var(--border)"}`,
                color: done ? "var(--green)" : "var(--text)",
                textDecoration: done ? "line-through" : "none",
                opacity: done ? 0.85 : 1,
              }}>
              {done ? "✓ " : ""}{ref}
            </span>
          );
        })}
      </div>

      {/* Progress */}
      {hasMapped && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--tint-accent)" }}>
            <div className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: allDone ? "linear-gradient(90deg, var(--green), var(--accent))" : `linear-gradient(90deg, ${c1}, ${c2})`,
                boxShadow: pct! > 0 ? `0 0 8px ${c1}60` : "none",
              }} />
          </div>
          <span className="text-xs font-semibold flex-shrink-0"
            style={{ color: allDone ? "var(--green)" : "var(--muted)" }}>
            {doneCount}/{mappedCount}
          </span>
        </div>
      )}
    </div>
  );
}

function DayRow({
  day,
  completedMap,
  moduleMap,
}: {
  day: DayData;
  completedMap: Record<string, number | false>;
  moduleMap: Map<string, string>;
}) {
  const today = isToday(day.date);
  const past = isPast(day.date);
  // A task is "done" only if it has mapped lectures AND all are completed.
  // Tasks with no lectureIds are never auto-done (require manual completion).
  const doneTasks = day.tasks.filter(
    (t) => t.lectureIds.length > 0 && t.lectureIds.every((id) => !!completedMap[id])
  ).length;
  const totalTasks = day.tasks.length;
  const dayPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : null;
  const totalHours = day.tasks.reduce((s, t) => s + t.hours, 0);

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: `1px solid ${today ? "var(--accent)" : "var(--border)"}`,
        boxShadow: today ? "0 0 30px rgba(99,120,255,0.12)" : "none",
        opacity: past && !today ? 0.75 : 1,
      }}>
      {/* Day header */}
      <div className="flex items-center gap-4 px-5 py-4"
        style={{
          background: today ? "var(--today-header-bg)" : "var(--tint-accent)",
          borderBottom: "1px solid var(--border)",
        }}>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-base" style={{ color: today ? "var(--accent2)" : "var(--text)" }}>
              {day.label}
            </p>
            {today && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "var(--tint-accent-hover)", color: "var(--accent)" }}>
                Today
              </span>
            )}
            {past && !today && (
              <span className="text-xs" style={{ color: "var(--muted)" }}>Past</span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {day.tasks.length} tasks · {totalHours.toFixed(1)}h planned
          </p>
        </div>
        {dayPct !== null && (
          <div className="flex items-center gap-3">
            <div className="w-24 h-1.5 rounded-full" style={{ background: "var(--tint-accent)" }}>
              <div className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${dayPct}%`,
                  background: dayPct === 100 ? "linear-gradient(90deg, var(--green), var(--accent))" : "linear-gradient(90deg, var(--accent), var(--accent2))",
                  boxShadow: dayPct > 0 ? "0 0 8px rgba(99,120,255,0.4)" : "none",
                }} />
            </div>
            <span className="text-sm font-bold w-10 text-right"
              style={{ color: dayPct === 100 ? "var(--green)" : "var(--accent2)" }}>
              {dayPct}%
            </span>
          </div>
        )}
      </div>

      {/* Tasks grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        style={{ background: "var(--day-tasks-bg)" }}>
        {day.tasks.map((task, i) => (
          <TaskCard key={i} task={task} completedMap={completedMap}
            moduleId={moduleMap.get(`${task.subject.toLowerCase()}||${task.module.toLowerCase()}`)} />
        ))}
      </div>
    </div>
  );
}

export default function WeeklyClient({ weeks, subjects }: { weeks: WeekData[]; subjects: Subject[] }) {
  const router = useRouter();
  const [completedMap, setCompletedMap] = useState<Record<string, number | false>>({});
  const [activeWeek, setActiveWeek] = useState<string>("");

  // Build "subjectName||moduleName" (lowercased) → moduleId map for direct linking
  const moduleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subjects) {
      for (const m of s.modules) {
        map.set(`${s.name.toLowerCase()}||${m.name.toLowerCase()}`, m.id);
      }
    }
    return map;
  }, [subjects]);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace("/"); return; }
    getUser(u).then((data) => setCompletedMap(data.completedLectures));
    const today = new Date().toISOString().split("T")[0];
    const current = weeks.find((w) => w.days.some((d) => d.date === today));
    setActiveWeek(current?.weekId ?? weeks[weeks.length - 1].weekId);
  }, [router, weeks]);

  const week = weeks.find((w) => w.weekId === activeWeek) ?? weeks[0];

  const weekTotalTasks = week.days.reduce((s, d) => s + d.tasks.length, 0);
  const weekDoneTasks = week.days.reduce(
    (s, d) =>
      s +
      d.tasks.filter(
        (t) => t.lectureIds.length > 0 && t.lectureIds.every((id) => !!completedMap[id])
      ).length,
    0
  );
  const weekPct = weekTotalTasks > 0 ? Math.round((weekDoneTasks / weekTotalTasks) * 100) : 0;
  const totalHours = week.days.reduce((s, d) => s + d.tasks.reduce((ts, t) => ts + t.hours, 0), 0);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="glow-orb w-96 h-96 -top-32 -right-32" style={{ background: "rgba(167,139,250,0.07)" }} />
      <div className="glow-orb w-64 h-64 bottom-0 -left-16" style={{ background: "rgba(99,120,255,0.05)" }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 fade-in">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm transition-all hover:opacity-80" style={{ color: "var(--muted)" }}>
              ← Dashboard
            </Link>
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
            <h1 className="text-lg font-bold">
              <span className="grad-text">GO Classes</span> Weekly Planner
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/activity" className="text-sm transition-all hover:opacity-80" style={{ color: "var(--muted)" }}>
              Activity →
            </Link>
          </div>
        </div>

        {/* Week selector */}
        <div className="flex gap-2 flex-wrap mb-6 fade-in-1">
          {weeks.map((w) => (
            <button key={w.weekId} onClick={() => setActiveWeek(w.weekId)}
              className="text-xs px-4 py-2 rounded-xl transition-all"
              style={{
                background: w.weekId === activeWeek ? "linear-gradient(135deg, var(--accent), #8b5cf6)" : "var(--tint-accent)",
                border: `1px solid ${w.weekId === activeWeek ? "transparent" : "var(--border)"}`,
                color: w.weekId === activeWeek ? "white" : "var(--muted)",
                fontWeight: w.weekId === activeWeek ? 600 : 400,
              }}>
              {w.label}
            </button>
          ))}
        </div>

        {/* Week summary */}
        <div className="glass p-5 mb-8 fade-in-2 relative overflow-hidden">
          <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold mb-2" style={{ color: "var(--text)" }}>{week.label}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full" style={{ background: "var(--tint-accent)" }}>
                  <div className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${weekPct}%`,
                      background: weekPct === 100 ? "linear-gradient(90deg, var(--green), var(--accent))" : "linear-gradient(90deg, var(--accent), var(--accent2))",
                      boxShadow: weekPct > 0 ? "0 0 10px rgba(99,120,255,0.4)" : "none",
                    }} />
                </div>
                <span className="text-sm font-bold flex-shrink-0"
                  style={{ color: weekPct === 100 ? "var(--green)" : "var(--accent2)" }}>
                  {weekPct}%
                </span>
              </div>
            </div>
            <div className="flex gap-6">
              {[
                { label: "Tasks", val: weekTotalTasks },
                { label: "Done", val: weekDoneTasks },
                { label: "Hours", val: `${totalHours.toFixed(1)}h` },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-xl font-bold grad-text">{s.val}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* GO Classes Schedule Dropdown */}
        <div className="mb-8 fade-in-2">
          <GOClassesScheduleDropdown />
        </div>

        {/* Day rows — vertical */}
        <div className="flex flex-col gap-4 fade-in-3">
          {week.days.map((day) => (
            <DayRow key={day.date} day={day} completedMap={completedMap} moduleMap={moduleMap} />
          ))}
        </div>
      </div>
    </div>
  );
}
