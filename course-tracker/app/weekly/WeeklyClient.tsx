"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUser } from "@/lib/store";
import ThemeToggle from "@/components/ThemeToggle";
import GOClassesScheduleDropdown from "@/components/GOClassesScheduleDropdown";
import WeekSidebar from "./WeekSidebar";
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
  onManualToggle,
  isManuallyCompleted,
  date,
}: {
  task: TaskData;
  completedMap: Record<string, number | false>;
  moduleId: string | undefined;
  onManualToggle?: (task: TaskData, isCompleted: boolean, date?: string) => void;
  isManuallyCompleted?: boolean;
  date?: string;
}) {
  const [c1, c2] = getSubjectColor(task.subject);
  const mappedCount = task.lectureIds.length;
  const doneCount = task.lectureIds.filter((id) => !!completedMap[id]).length;
  const hasMapped = mappedCount > 0;
  const allDone = hasMapped && doneCount === mappedCount;
  const pct = hasMapped ? Math.round((doneCount / mappedCount) * 100) : null;
  
  // Check if task should be considered completed (manual completion takes priority)
  const isCompleted = isManuallyCompleted || (hasMapped && allDone);
  
  // Toggle manual completion
  const handleManualToggle = () => {
    console.log('Manual toggle clicked!', { task: task.subject, isCompleted, date });
    if (onManualToggle) {
      onManualToggle(task, !isCompleted, date);
    }
  };

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3 transition-all"
      style={{
        background: isCompleted ? "var(--tint-green)" : "var(--card-bg)",
        border: `1px solid ${isCompleted ? "var(--tint-green-border)" : "var(--border)"}`,
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
        <div className="flex items-center gap-2">
          {/* Manual completion checkbox when ANY lecture is missing from tracking */}
          {(!hasMapped || task.lectureIds.some(id => completedMap[id] === undefined)) && (
            <button
              onClick={handleManualToggle}
              className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all hover:scale-110"
              style={{
                borderColor: isCompleted ? "var(--green)" : "var(--border)",
                background: isCompleted ? "var(--green)" : "transparent",
              }}
              title="Mark as complete">
              {isCompleted && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}
          <span className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg"
            style={{ background: `${c1}22`, color: c1 }}>
            {Number.isInteger(task.hours) ? task.hours : task.hours.toFixed(2).replace(/\.?0+$/, "")}h
          </span>
        </div>
      </div>

      {/* Lecture tags */}
      <div className="flex flex-wrap gap-1.5">
        {task.lectureRefs.map((ref, i) => {
          const id = task.lectureIds[i];
          const done = id ? !!completedMap[id] : (isManuallyCompleted || false);
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
      
      {/* Manual completion indicator */}
      {!hasMapped && isCompleted && (
        <div className="text-xs text-center" style={{ color: "var(--green)" }}>
          ✓ Manually marked as complete
        </div>
      )}
    </div>
  );
}

function DayRow({
  day,
  completedMap,
  moduleMap,
  onManualTaskToggle,
  getTaskManualCompletion,
}: {
  day: DayData;
  completedMap: Record<string, number | false>;
  moduleMap: Map<string, string>;
  onManualTaskToggle?: (task: TaskData, isCompleted: boolean, date?: string) => void;
  getTaskManualCompletion?: (task: TaskData, date?: string) => boolean;
}) {
  const today = isToday(day.date);
  const past = isPast(day.date);
  const mappedCount = day.tasks.reduce((s, t) => s + t.lectureIds.length, 0);
  const doneCount = day.tasks.reduce(
    (s, t) => s + t.lectureIds.filter((id) => !!completedMap[id]).length,
    0
  );
  const dayPct = mappedCount > 0 ? Math.round((doneCount / mappedCount) * 100) : null;

  return (
    <div className="glass mb-4 fade-in relative overflow-hidden"
      style={{
        background: today ? "var(--day-today-bg)" : "var(--card-bg)",
        border: `1px solid ${today ? "var(--day-today-border)" : "var(--border)"}`,
      }}>
      {today && <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />}

      <div className="p-4">
        {/* Date header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: today ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--muted)",
                boxShadow: today ? "0 0 12px rgba(99,120,255,0.4)" : "none",
              }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{day.label}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {today ? "Today" : past ? "Past" : "Upcoming"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-lg font-medium"
              style={{
                background: today ? "var(--tint-accent)" : "var(--day-tasks-bg)",
                color: "var(--muted)",
              }}>
              {day.tasks.length} {day.tasks.length === 1 ? "task" : "tasks"}
            </span>
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
        </div>

        {/* Tasks grid */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          style={{ background: "var(--day-tasks-bg)" }}>
          {day.tasks.map((task, i) => (
            <TaskCard 
              key={i} 
              task={task} 
              completedMap={completedMap}
              moduleId={moduleMap.get(`${task.subject.toLowerCase()}||${task.module.toLowerCase()}`)}
              onManualToggle={onManualTaskToggle}
              isManuallyCompleted={getTaskManualCompletion?.(task, day.date)}
              date={day.date}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WeeklyClient({ weeks, subjects }: { weeks: WeekData[]; subjects: Subject[] }) {
  const router = useRouter();
  const [completedMap, setCompletedMap] = useState<Record<string, number | false>>({});
  const [activeWeek, setActiveWeek] = useState<string>("");
  const [manualCompletedTasks, setManualCompletedTasks] = useState<Set<string>>(new Set());

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
    getUser(u).then((data) => {
      setCompletedMap(data.completedLectures);
      // Load manual completions from localStorage
      const saved = localStorage.getItem(`manualCompleted_${u}`);
      if (saved) {
        setManualCompletedTasks(new Set(JSON.parse(saved)));
      }
    });
    const today = new Date().toISOString().split("T")[0];
    const current = weeks.find((w) => w.days.some((d) => d.date === today));
    setActiveWeek(current?.weekId ?? weeks[weeks.length - 1].weekId);
  }, [router, weeks]);

  // Handle manual task completion toggle
  const handleManualTaskToggle = (task: TaskData, isCompleted: boolean, date?: string) => {
    console.log('handleManualTaskToggle called!', { task: task.subject, isCompleted, date });
    // Create a more unique key using date as well to avoid conflicts
    const taskKey = `${date || 'unknown'}|${task.subject}|${task.module}|${task.lectureRefs.join('|')}|${task.hours}`;
    console.log('Task key:', taskKey);
    const newManualCompleted = new Set(manualCompletedTasks);
    
    if (isCompleted) {
      newManualCompleted.add(taskKey);
      console.log('Adding to manual completed');
    } else {
      newManualCompleted.delete(taskKey);
      console.log('Removing from manual completed');
    }
    
    console.log('New manual completed set:', [...newManualCompleted]);
    setManualCompletedTasks(newManualCompleted);
    
    // Save to localStorage
    const u = getCurrentUser();
    if (u) {
      localStorage.setItem(`manualCompleted_${u}`, JSON.stringify([...newManualCompleted]));
      console.log('Saved to localStorage');
    }
  };

  // Check if a task is manually completed
  const isTaskManuallyCompleted = (task: TaskData, date?: string): boolean => {
    // Use the same key generation logic
    const taskKey = `${date || 'unknown'}|${task.subject}|${task.module}|${task.lectureRefs.join('|')}|${task.hours}`;
    return manualCompletedTasks.has(taskKey);
  };

  const week = weeks.find((w) => w.weekId === activeWeek) ?? weeks[0];

  const weekTotalTasks = week.days.reduce((s, d) => s + d.tasks.length, 0);
  const weekDoneTasks = week.days.reduce(
    (s, d) =>
      s +
      d.tasks.filter(
        (t) => {
          // Check if task has lecture IDs and all are completed
          if (t.lectureIds.length > 0) {
            return t.lectureIds.every((id) => !!completedMap[id]);
          }
          // Otherwise check if manually completed
          return isTaskManuallyCompleted(t, d.date);
        }
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

        {/* Main Content Area with Sidebar */}
        <div className="flex gap-6">
          {/* Week Sidebar */}
          <WeekSidebar 
            weeks={weeks}
            subjects={subjects}
            completedMap={completedMap}
            manualCompletedTasks={manualCompletedTasks}
            onWeekSelect={setActiveWeek}
            activeWeek={activeWeek}
          />

          {/* Day rows for active week */}
          <div className="flex-1">
            {activeWeek && (
              <div className="fade-in-3">
                {(() => {
                  const currentWeek = weeks.find(w => w.weekId === activeWeek);
                  if (!currentWeek) return null;
                  
                  return (
                    <div className="flex flex-col gap-4">
                      {currentWeek.days.map((day) => (
                        <DayRow 
                          key={day.date} 
                          day={day} 
                          completedMap={completedMap} 
                          moduleMap={moduleMap}
                          onManualTaskToggle={handleManualTaskToggle}
                          getTaskManualCompletion={isTaskManuallyCompleted}
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
