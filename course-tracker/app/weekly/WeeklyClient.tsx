"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUser, toggleManualLectureRef } from "@/lib/store";
import GOClassesScheduleDropdown from "@/components/GOClassesScheduleDropdown";
import WeekSidebar from "./WeekSidebar";
import type { Subject } from "@/lib/courseLoader";
import type { WeekData, DayData, TaskData } from "./page";

const SUBJECT_COLORS: Record<string, [string, string]> = {
  "Engineering Mathematics": ["#6378ff", "#a78bfa"],
  "Discrete Mathematics":    ["#22d3a5", "#6378ff"],
  "Fundamentals (Aptitude)": ["#f59e0b", "#ef4444"],
  "Aptitude":                ["#f59e0b", "#ef4444"],
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
  task, completedMap, moduleId, manualRefs, onRefToggle, date,
}: {
  task: TaskData;
  completedMap: Record<string, number | false>;
  moduleId: string | undefined;
  manualRefs: Record<string, number | false>;
  onRefToggle: (key: string, value: boolean) => void;
  date: string;
}) {
  const [c1, c2] = getSubjectColor(task.subject);

  // Per-ref completion: tracked lectureId takes priority, else manual ref key
  const refStatuses = task.lectureRefs.map((ref, i) => {
    const lectureId = task.lectureIds[i];
    if (lectureId && completedMap[lectureId]) return { done: true, hasId: true, key: lectureId };
    const manualKey = `${date}|${task.subject}|${task.module}|${i}|${ref}`;
    const manualDone = !!manualRefs[manualKey];
    return { done: manualDone, hasId: !!lectureId, key: manualKey, manualKey };
  });

  const totalRefs = refStatuses.length;
  const doneRefs = refStatuses.filter((r) => r.done).length;
  const allDone = totalRefs > 0 && doneRefs === totalRefs;
  const pct = totalRefs > 0 ? Math.round((doneRefs / totalRefs) * 100) : 0;

  return (
    <div className="rounded-xl p-3 flex flex-col gap-2.5 transition-all"
      style={{
        background: allDone ? "var(--tint-green)" : "var(--surface2)",
        border: `1px solid ${allDone ? "var(--tint-green-border)" : "var(--border)"}`,
      }}>
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="w-0.5 self-stretch rounded-full flex-shrink-0 mt-0.5"
          style={{ background: `linear-gradient(180deg, ${c1}, ${c2})` }} />
        <div className="flex-1 min-w-0">
          {moduleId ? (
            <Link href={`/module/${moduleId}`}
              className="text-xs font-semibold hover:underline underline-offset-2 block truncate"
              style={{ color: c1 }}>
              {task.subject} ↗
            </Link>
          ) : (
            <p className="text-xs font-semibold truncate" style={{ color: c1 }}>{task.subject}</p>
          )}
          {moduleId ? (
            <Link href={`/module/${moduleId}`}
              className="text-xs truncate block hover:underline underline-offset-2 mt-0.5"
              style={{ color: "var(--muted)" }}>
              {task.module}
            </Link>
          ) : (
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--muted)" }}>{task.module}</p>
          )}
        </div>
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
          style={{ background: `${c1}22`, color: c1 }}>
          {Number.isInteger(task.hours) ? task.hours : task.hours.toFixed(2).replace(/\.?0+$/, "")}h
        </span>
      </div>

      {/* Per-ref lecture tags with individual checkboxes */}
      <div className="flex flex-wrap gap-1.5">
        {task.lectureRefs.map((ref, i) => {
          const { done, hasId, manualKey } = refStatuses[i];
          const canToggle = !hasId; // only show checkbox if no tracked lectureId
          return (
            <button
              key={i}
              disabled={hasId} // tracked lectures toggle via the module page
              onClick={() => canToggle && onRefToggle(manualKey!, !done)}
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all"
              style={{
                background: done ? "var(--tint-green)" : "var(--tint-accent)",
                border: `1px solid ${done ? "var(--tint-green-border)" : "var(--border)"}`,
                color: done ? "var(--green)" : "var(--text)",
                textDecoration: done ? "line-through" : "none",
                opacity: done ? 0.9 : 1,
                cursor: canToggle ? "pointer" : "default",
              }}>
              {/* Checkbox for untracked refs */}
              {canToggle && (
                <span className="w-3 h-3 rounded border flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: done ? "var(--green)" : "var(--border)",
                    background: done ? "var(--green)" : "transparent",
                  }}>
                  {done && (
                    <svg width="8" height="8" viewBox="0 0 20 20" fill="white">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
              )}
              {done && hasId ? "✓ " : ""}{ref}
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      {totalRefs > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full" style={{ background: "var(--border)" }}>
            <div className="h-1 rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: allDone
                  ? "linear-gradient(90deg, var(--green), var(--accent))"
                  : `linear-gradient(90deg, ${c1}, ${c2})`,
              }} />
          </div>
          <span className="text-xs font-medium flex-shrink-0"
            style={{ color: allDone ? "var(--green)" : "var(--muted)" }}>
            {doneRefs}/{totalRefs}
          </span>
        </div>
      )}
    </div>
  );
}

function DayRow({
  day, completedMap, moduleMap, manualRefs, onRefToggle,
}: {
  day: DayData;
  completedMap: Record<string, number | false>;
  moduleMap: Map<string, string>;
  manualRefs: Record<string, number | false>;
  onRefToggle: (key: string, value: boolean) => void;
}) {
  const today = isToday(day.date);
  const past = isPast(day.date);

  // Count completion across all refs (tracked + manual)
  const { totalRefs, doneRefs } = day.tasks.reduce((acc, task) => {
    task.lectureRefs.forEach((ref, i) => {
      acc.totalRefs++;
      const lectureId = task.lectureIds[i];
      if (lectureId && completedMap[lectureId]) { acc.doneRefs++; return; }
      const manualKey = `${day.date}|${task.subject}|${task.module}|${i}|${ref}`;
      if (manualRefs[manualKey]) acc.doneRefs++;
    });
    return acc;
  }, { totalRefs: 0, doneRefs: 0 });

  const dayPct = totalRefs > 0 ? Math.round((doneRefs / totalRefs) * 100) : null;

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{
        border: `1px solid ${today ? "var(--accent)" : "var(--border)"}`,
        background: "var(--card-bg)",
        boxShadow: today ? "0 0 0 1px var(--accent)22" : "none",
      }}>
      {/* Day header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{
          background: today ? "var(--today-header-bg)" : "var(--surface2)",
          borderBottom: "1px solid var(--border)",
        }}>
        <div className="flex items-center gap-2.5">
          {today && (
            <span className="w-1.5 h-1.5 rounded-full pulse-dot flex-shrink-0"
              style={{ background: "var(--accent)" }} />
          )}
          <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{day.label}</span>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: today ? "var(--tint-accent)" : "var(--surface)",
              color: today ? "var(--accent)" : "var(--muted)",
              border: "1px solid var(--border)",
            }}>
            {today ? "Today" : past ? "Past" : "Upcoming"}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {day.tasks.length} task{day.tasks.length !== 1 ? "s" : ""}
          </span>
        </div>

        {dayPct !== null && (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full" style={{ background: "var(--border)" }}>
              <div className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${dayPct}%`,
                  background: dayPct === 100
                    ? "linear-gradient(90deg, var(--green), var(--accent))"
                    : "linear-gradient(90deg, var(--accent), var(--accent2))",
                }} />
            </div>
            <span className="text-xs font-bold w-8 text-right"
              style={{ color: dayPct === 100 ? "var(--green)" : "var(--accent2)" }}>
              {dayPct}%
            </span>
          </div>
        )}
      </div>

      {/* Tasks grid */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {day.tasks.map((task, i) => (
          <TaskCard
            key={i}
            task={task}
            completedMap={completedMap}
            moduleId={moduleMap.get(`${task.subject.toLowerCase()}||${task.module.toLowerCase()}`)}
            manualRefs={manualRefs}
            onRefToggle={onRefToggle}
            date={day.date}
          />
        ))}
      </div>
    </div>
  );
}

export default function WeeklyClient({ weeks, subjects }: { weeks: WeekData[]; subjects: Subject[] }) {
  const router = useRouter();
  const [completedMap, setCompletedMap] = useState<Record<string, number | false>>({});
  const [manualRefs, setManualRefs] = useState<Record<string, number | false>>({});
  const [activeWeek, setActiveWeek] = useState<string>("");

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
    getUser(u).then((data) => {
      setCompletedMap(data.completedLectures);
      setManualRefs(data.manualLectureRefs ?? {});
    });
    const today = new Date().toISOString().split("T")[0];
    const current = weeks.find((w) => w.days.some((d) => d.date === today));
    setActiveWeek(current?.weekId ?? weeks[weeks.length - 1].weekId);
  }, [router, weeks]);

  async function handleRefToggle(key: string, value: boolean) {
    const u = getCurrentUser();
    if (!u) return;
    // Optimistic update
    setManualRefs((prev) => ({ ...prev, [key]: value ? Date.now() : false }));
    await toggleManualLectureRef(u, key, value);
  }

  // Compute week stats using both completedMap and manualRefs
  const week = weeks.find((w) => w.weekId === activeWeek) ?? weeks[0];

  const { weekTotalRefs, weekDoneRefs } = week.days.reduce((acc, day) => {
    day.tasks.forEach((task) => {
      task.lectureRefs.forEach((ref, i) => {
        acc.weekTotalRefs++;
        const lectureId = task.lectureIds[i];
        if (lectureId && completedMap[lectureId]) { acc.weekDoneRefs++; return; }
        const manualKey = `${day.date}|${task.subject}|${task.module}|${i}|${ref}`;
        if (manualRefs[manualKey]) acc.weekDoneRefs++;
      });
    });
    return acc;
  }, { weekTotalRefs: 0, weekDoneRefs: 0 });

  const weekPct = weekTotalRefs > 0 ? Math.round((weekDoneRefs / weekTotalRefs) * 100) : 0;
  const totalHours = week.days.reduce((s, d) => s + d.tasks.reduce((ts, t) => ts + t.hours, 0), 0);

  // For sidebar compat — convert manualRefs to a Set of task keys (legacy format)
  const manualCompletedTasks = useMemo(() => {
    const set = new Set<string>();
    // sidebar uses task-level keys; we approximate by checking if all refs of a task are done
    weeks.forEach((w) => {
      w.days.forEach((day) => {
        day.tasks.forEach((task) => {
          const allDone = task.lectureRefs.every((ref, i) => {
            const lectureId = task.lectureIds[i];
            if (lectureId && completedMap[lectureId]) return true;
            const manualKey = `${day.date}|${task.subject}|${task.module}|${i}|${ref}`;
            return !!manualRefs[manualKey];
          });
          if (allDone && task.lectureRefs.length > 0) {
            const taskKey = `${day.date}|${task.subject}|${task.module}|${task.lectureRefs.join("|")}|${task.hours}`;
            set.add(taskKey);
          }
        });
      });
    });
    return set;
  }, [manualRefs, completedMap, weeks]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="mb-6 fade-in">
          <h1 className="text-base font-bold">
            <span className="grad-text">GO Classes</span>
            <span style={{ color: "var(--text)" }}> Weekly Planner</span>
          </h1>
        </div>

        {/* ── Week summary bar ── */}
        <div className="glass p-4 mb-5 fade-in-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{week.label}</p>
                <span className="text-sm font-bold"
                  style={{ color: weekPct === 100 ? "var(--green)" : "var(--accent2)" }}>
                  {weekPct}%
                </span>
              </div>
              <div className="h-2 rounded-full" style={{ background: "var(--surface2)" }}>
                <div className="h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${weekPct}%`,
                    background: weekPct === 100
                      ? "linear-gradient(90deg, var(--green), var(--accent))"
                      : "linear-gradient(90deg, var(--accent), var(--accent2))",
                  }} />
              </div>
            </div>
            <div className="flex gap-5 flex-shrink-0">
              {[
                { label: "Lectures", val: weekTotalRefs },
                { label: "Done", val: weekDoneRefs },
                { label: "Hours", val: `${totalHours.toFixed(1)}h` },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-lg font-bold grad-text">{s.val}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── GO Classes schedule (collapsible) ── */}
        <div className="mb-5 fade-in-2">
          <GOClassesScheduleDropdown />
        </div>

        {/* ── Main layout: sidebar + days ── */}
        <div className="flex gap-5 items-start fade-in-3">
          <WeekSidebar
            weeks={weeks}
            subjects={subjects}
            completedMap={completedMap}
            manualCompletedTasks={manualCompletedTasks}
            onWeekSelect={setActiveWeek}
            activeWeek={activeWeek}
          />

          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {week.days.map((day) => (
              <DayRow
                key={day.date}
                day={day}
                completedMap={completedMap}
                moduleMap={moduleMap}
                manualRefs={manualRefs}
                onRefToggle={handleRefToggle}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
