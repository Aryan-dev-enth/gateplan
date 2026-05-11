"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUser, toggleManualLectureRef, toggleLecture } from "@/lib/store";
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
  task, completedMap, moduleId, manualRefs, onRefToggle, date, taskIndex,
}: {
  task: TaskData;
  completedMap: Record<string, number | false>;
  moduleId: string | undefined;
  manualRefs: Record<string, number | false>;
  onRefToggle: (key: string, value: boolean, lectureId?: string) => void;
  date: string;
  taskIndex: number;
}) {
  const [c1, c2] = getSubjectColor(task.subject);

  // Per-ref completion: tracked lectureId takes priority, else manual ref key
  const refStatuses = task.lectureRefs.map((ref, i) => {
    const lectureId = task.lectureIds[i];
    const manualKey = `${date}|${task.subject}|${task.module}|${taskIndex}|${i}|${ref}`;
    const lectureDone = !!(lectureId && completedMap[lectureId]);
    const manualDone = !!manualRefs[manualKey];
    return { 
      done: lectureDone || manualDone, 
      hasId: !!lectureId, 
      lectureId, 
      manualKey 
    };
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

        {task.lectureRefs.map((ref, i) => {
          const { done, hasId, lectureId, manualKey } = refStatuses[i];
          const isQuiz = /quiz/i.test(ref);
          const isPractice = /question|solving|practice/i.test(ref) && !isQuiz;
          const isHomework = /homework|hw/i.test(ref) && !isQuiz;
          
          return (
            <button
              key={i}
              onClick={() => onRefToggle(manualKey, !done, hasId ? lectureId : undefined)}
              className="flex items-center gap-1.5 px-2.5 rounded-full transition-all"
              style={{
                background: done 
                  ? "var(--tint-green)" 
                  : isQuiz 
                    ? "rgba(255,193,7,0.12)" 
                    : isPractice
                      ? "rgba(99,120,255,0.12)"
                      : isHomework
                        ? "rgba(139,92,246,0.12)"
                        : "var(--tint-accent)",
                border: `1.5px solid ${
                  done 
                    ? "var(--tint-green-border)" 
                    : isQuiz 
                      ? "rgba(255,193,7,0.4)" 
                      : isPractice
                        ? "rgba(99,120,255,0.4)"
                        : isHomework
                          ? "rgba(139,92,246,0.4)"
                          : "var(--border)"
                }`,
                color: done 
                  ? "var(--green)" 
                  : isQuiz 
                    ? "#f59e0b" 
                    : isPractice
                      ? "var(--accent2)"
                      : isHomework
                        ? "#8b5cf6"
                        : "var(--text)",
                textDecoration: done ? "line-through" : "none",
                opacity: done ? 0.9 : 1,
                cursor: "pointer",
                padding: (isQuiz || isPractice || isHomework) ? "0.5rem 0.75rem" : "0.25rem 0.5rem",
                fontSize: (isQuiz || isPractice || isHomework) ? "0.8125rem" : "0.75rem",
                fontWeight: (isQuiz || isPractice || isHomework) ? 600 : 400,
              }}>
              {/* Checkbox for all refs */}
              <span className="rounded border flex items-center justify-center flex-shrink-0"
                style={{
                  width: (isQuiz || isPractice || isHomework) ? "14px" : "12px",
                  height: (isQuiz || isPractice || isHomework) ? "14px" : "12px",
                  borderColor: done 
                    ? "var(--green)" 
                    : isQuiz 
                      ? "#f59e0b" 
                      : isPractice
                        ? "var(--accent2)"
                        : isHomework
                          ? "#8b5cf6"
                          : "var(--border)",
                  background: done ? "var(--green)" : "transparent",
                  borderWidth: (isQuiz || isPractice || isHomework) ? "2px" : "1px",
                }}>
                {done && (
                  <svg width={(isQuiz || isPractice || isHomework) ? "10" : "8"} height={(isQuiz || isPractice || isHomework) ? "10" : "8"} viewBox="0 0 20 20" fill="white">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              {isQuiz && <span style={{ fontSize: "0.7rem" }}>📝</span>}
              {isPractice && <span style={{ fontSize: "0.7rem" }}>💡</span>}
              {isHomework && <span style={{ fontSize: "0.7rem" }}>📚</span>}
              {ref}
            </button>
          );
        })}

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
  onRefToggle: (key: string, value: boolean, lectureId?: string) => void;
}) {
  const today = isToday(day.date);
  const past = isPast(day.date);

  // Count completion hours
  const { totalHours, doneHours } = day.tasks.reduce((acc, task, taskIdx) => {
    acc.totalHours += task.hours;
    const taskTotalRefs = task.lectureRefs.length;
    if (taskTotalRefs > 0) {
      let taskDoneRefs = 0;
      task.lectureRefs.forEach((ref, i) => {
        const lectureId = task.lectureIds[i];
        const manualKey = `${day.date}|${task.subject}|${task.module}|${taskIdx}|${i}|${ref}`;
        if ((lectureId && completedMap[lectureId]) || manualRefs[manualKey]) {
          taskDoneRefs++;
        }
      });
      acc.doneHours += (taskDoneRefs / taskTotalRefs) * task.hours;
    }
    return acc;
  }, { totalHours: 0, doneHours: 0 });

  const dayPct = totalHours > 0 ? Math.round((doneHours / totalHours) * 100) : null;

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
            taskIndex={i}
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
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);

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
    
    // Restore active week from localStorage or default to current week
    const savedWeek = localStorage.getItem("activeWeek");
    if (savedWeek && weeks.some(w => w.weekId === savedWeek)) {
      setActiveWeek(savedWeek);
    } else {
      const today = new Date().toISOString().split("T")[0];
      const current = weeks.find((w) => w.days.some((d) => d.date === today));
      const defaultWeek = current?.weekId ?? weeks[weeks.length - 1].weekId;
      setActiveWeek(defaultWeek);
      localStorage.setItem("activeWeek", defaultWeek);
    }
  }, [router, weeks]);

  // Save active week to localStorage whenever it changes
  useEffect(() => {
    if (activeWeek) {
      localStorage.setItem("activeWeek", activeWeek);
    }
  }, [activeWeek]);

  async function handleRefToggle(key: string, value: boolean, lectureId?: string) {
    const u = getCurrentUser();
    if (!u) return;

    // Always update manual ref for the weekly plan (it's the source of truth for this specific view's strike-out)
    setManualRefs((prev) => ({ ...prev, [key]: value ? Date.now() : false }));
    await toggleManualLectureRef(u, key, value);

    if (lectureId) {
      // Also try to sync with the tracked lecture progress
      setCompletedMap((prev) => ({ ...prev, [lectureId]: value ? Date.now() : false }));
      const currentStatus = !!completedMap[lectureId];
      if (currentStatus !== value) {
        try {
          await toggleLecture(u, lectureId);
        } catch (e) {
          console.error("Failed to sync tracked lecture status:", e);
        }
      }
    }
  }

  // Compute week stats using both completedMap and manualRefs
  const week = weeks.find((w) => w.weekId === activeWeek) ?? weeks[0];

  // Extract all quizzes from the week
  const weekQuizzes = useMemo(() => {
    const quizzes: Array<{
      ref: string;
      date: string;
      dateLabel: string;
      subject: string;
      module: string;
      done: boolean;
      manualKey: string;
      lectureId?: string;
      taskIndex: number;
      refIndex: number;
    }> = [];
    
    week.days.forEach((day) => {
      day.tasks.forEach((task, taskIdx) => {
        task.lectureRefs.forEach((ref, refIdx) => {
          if (/quiz/i.test(ref)) {
            const lectureId = task.lectureIds[refIdx];
            const manualKey = `${day.date}|${task.subject}|${task.module}|${taskIdx}|${refIdx}|${ref}`;
            const done = !!(lectureId && completedMap[lectureId]) || !!manualRefs[manualKey];
            
            quizzes.push({
              ref,
              date: day.date,
              dateLabel: day.label,
              subject: task.subject,
              module: task.module,
              done,
              manualKey,
              lectureId,
              taskIndex: taskIdx,
              refIndex: refIdx,
            });
          }
        });
      });
    });
    
    return quizzes;
  }, [week, completedMap, manualRefs]);

  // Extract ALL quizzes from ALL weeks
  const allQuizzes = useMemo(() => {
    const quizzes: Array<{
      ref: string;
      date: string;
      dateLabel: string;
      weekLabel: string;
      weekId: string;
      subject: string;
      module: string;
      done: boolean;
      manualKey: string;
      lectureId?: string;
    }> = [];
    
    weeks.forEach((w) => {
      w.days.forEach((day) => {
        day.tasks.forEach((task, taskIdx) => {
          task.lectureRefs.forEach((ref, refIdx) => {
            if (/quiz/i.test(ref)) {
              const lectureId = task.lectureIds[refIdx];
              const manualKey = `${day.date}|${task.subject}|${task.module}|${taskIdx}|${refIdx}|${ref}`;
              const done = !!(lectureId && completedMap[lectureId]) || !!manualRefs[manualKey];
              
              quizzes.push({
                ref,
                date: day.date,
                dateLabel: day.label,
                weekLabel: w.label,
                weekId: w.weekId,
                subject: task.subject,
                module: task.module,
                done,
                manualKey,
                lectureId,
              });
            }
          });
        });
      });
    });
    
    return quizzes;
  }, [weeks, completedMap, manualRefs]);

  const { weekTotalRefs, weekDoneRefs, weekDoneHours, weekTotalHours } = week.days.reduce((acc, day) => {
    day.tasks.forEach((task, taskIdx) => {
      acc.weekTotalHours += task.hours;
      const tRefs = task.lectureRefs.length;
      let tDone = 0;
      task.lectureRefs.forEach((ref, i) => {
        acc.weekTotalRefs++;
        const lectureId = task.lectureIds[i];
        const manualKey = `${day.date}|${task.subject}|${task.module}|${taskIdx}|${i}|${ref}`;
        if ((lectureId && completedMap[lectureId]) || manualRefs[manualKey]) {
          acc.weekDoneRefs++;
          tDone++;
        }
      });
      if (tRefs > 0) {
        acc.weekDoneHours += (tDone / tRefs) * task.hours;
      }
    });
    return acc;
  }, { weekTotalRefs: 0, weekDoneRefs: 0, weekDoneHours: 0, weekTotalHours: 0 });

  const weekPct = weekTotalHours > 0 ? Math.round((weekDoneHours / weekTotalHours) * 100) : 0;
  const totalHours = weekTotalHours;

  const manualCompletedTasks = useMemo(() => {
    const set = new Set<string>();
    Object.entries(manualRefs).forEach(([key, val]) => {
      if (val) set.add(key);
    });
    return set;
  }, [manualRefs]);

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

        {/* ── Quick Week Navigation Bar ── */}
        <div className="mb-5 fade-in-1">
          <div className="glass p-3">
            <div className="flex items-center gap-2 flex-wrap">
              {weeks.map((w) => {
                const { weekTotalHours, weekDoneHours } = w.days.reduce((acc, day) => {
                  day.tasks.forEach((task, taskIdx) => {
                    acc.weekTotalHours += task.hours;
                    const tRefs = task.lectureRefs.length;
                    let tDone = 0;
                    task.lectureRefs.forEach((ref, i) => {
                      const lectureId = task.lectureIds[i];
                      const manualKey = `${day.date}|${task.subject}|${task.module}|${taskIdx}|${i}|${ref}`;
                      if ((lectureId && completedMap[lectureId]) || manualRefs[manualKey]) {
                        tDone++;
                      }
                    });
                    if (tRefs > 0) {
                      acc.weekDoneHours += (tDone / tRefs) * task.hours;
                    }
                  });
                  return acc;
                }, { weekTotalHours: 0, weekDoneHours: 0 });
                
                const wPct = weekTotalHours > 0 ? Math.round((weekDoneHours / weekTotalHours) * 100) : 0;
                const isActive = activeWeek === w.weekId;
                const firstDate = w.days[0]?.date ? new Date(w.days[0].date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
                
                // Get color based on completion percentage
                const getWeekColor = (pct: number): string => {
                  if (pct === 100) return "var(--green)";
                  if (pct >= 80) return "#10b981";
                  if (pct >= 60) return "#84cc16";
                  if (pct >= 40) return "#eab308";
                  if (pct >= 20) return "#f59e0b";
                  if (pct > 0) return "#ef4444";
                  return "var(--muted)";
                };
                
                const weekColor = getWeekColor(wPct);
                
                return (
                  <button
                    key={w.weekId}
                    onClick={() => setActiveWeek(w.weekId)}
                    className="flex-shrink-0 px-3 py-2 rounded-lg transition-all hover:opacity-90"
                    style={{
                      background: isActive ? "var(--tint-accent)" : "var(--surface2)",
                      border: `1.5px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                      minWidth: "100px",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold" 
                        style={{ color: isActive ? "var(--accent)" : "var(--text)" }}>
                        Week {w.weekId.replace("week-", "")}
                      </span>
                      <span className="text-[10px] font-medium" 
                        style={{ color: "var(--muted)" }}>
                        {firstDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--border)" }}>
                        <div className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${wPct}%`,
                            background: weekColor,
                          }} />
                      </div>
                      <span className="text-[10px] font-bold" 
                        style={{ color: weekColor }}>
                        {wPct}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Week summary bar ── */}
        <div className="glass p-4 mb-5 fade-in-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded"
                  style={{ background: "var(--tint-accent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                  Week {week.weekId.replace("week-", "")}
                </span>
                <p className="text-sm font-semibold flex-1" style={{ color: "var(--text)" }}>{week.label}</p>
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

        {/* ── Weekly Quizzes Summary ── */}
        {weekQuizzes.length > 0 && (
          <div className="glass p-4 mb-5 fade-in-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📝</span>
              <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                Weekly Quizzes ({weekQuizzes.filter(q => q.done).length}/{weekQuizzes.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {weekQuizzes.map((quiz, idx) => {
                const today = new Date().toISOString().split("T")[0];
                const isOverdue = quiz.date < today && !quiz.done;
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleRefToggle(quiz.manualKey, !quiz.done, quiz.lectureId)}
                    className="flex items-start gap-2.5 p-3 rounded-lg text-left transition-all hover:opacity-90"
                    style={{
                      background: quiz.done 
                        ? "rgba(34,211,165,0.08)" 
                        : isOverdue 
                          ? "rgba(239,68,68,0.08)" 
                          : "rgba(255,193,7,0.08)",
                      border: `1.5px solid ${quiz.done ? "rgba(34,211,165,0.3)" : isOverdue ? "rgba(239,68,68,0.3)" : "rgba(255,193,7,0.3)"}`,
                    }}
                  >
                    {/* Checkbox */}
                    <div className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center mt-0.5"
                      style={{
                        background: quiz.done ? "var(--green)" : "transparent",
                        border: `2px solid ${quiz.done ? "var(--green)" : isOverdue ? "#ef4444" : "#f59e0b"}`,
                      }}>
                      {quiz.done && (
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-md font-bold"
                          style={{
                            background: isOverdue ? "rgba(239,68,68,0.15)" : "rgba(255,193,7,0.15)",
                            color: isOverdue ? "#ef4444" : "#f59e0b",
                          }}>
                          {isOverdue ? "OVERDUE" : quiz.dateLabel}
                        </span>
                      </div>
                      <p className="text-xs font-medium mb-1 truncate"
                        style={{
                          color: quiz.done ? "var(--muted)" : isOverdue ? "#ef4444" : "var(--text)",
                          textDecoration: quiz.done ? "line-through" : "none",
                        }}>
                        {quiz.ref}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                        {quiz.subject} • {quiz.module}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

      {/* ── Floating Quiz Button ── */}
      <button
        onClick={() => setShowAllQuizzes(!showAllQuizzes)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40"
        style={{
          background: "linear-gradient(135deg, #f59e0b, #ef4444)",
          border: "2px solid rgba(255,255,255,0.2)",
        }}
      >
        <span className="text-2xl">📝</span>
      </button>

      {/* ── All Quizzes Side Panel ── */}
      {showAllQuizzes && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 transition-opacity"
            style={{ background: "rgba(0, 0, 0, 0.5)" }}
            onClick={() => setShowAllQuizzes(false)}
          />
          
          {/* Side Panel */}
          <div 
            className="fixed top-0 right-0 bottom-0 w-full sm:w-96 z-50 shadow-2xl overflow-hidden"
            style={{ background: "var(--bg)" }}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📝</span>
                  <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
                    All Quizzes ({allQuizzes.filter(q => q.done).length}/{allQuizzes.length})
                  </h2>
                </div>
                <button
                  onClick={() => setShowAllQuizzes(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                  style={{ background: "var(--surface2)", color: "var(--text)" }}
                >
                  ✕
                </button>
              </div>

              {/* Quiz List */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {allQuizzes.map((quiz, idx) => {
                    const today = new Date().toISOString().split("T")[0];
                    const isOverdue = quiz.date < today && !quiz.done;
                    const isActive = quiz.weekId === activeWeek;
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveWeek(quiz.weekId);
                          setShowAllQuizzes(false);
                        }}
                        className="w-full flex items-start gap-2.5 p-3 rounded-lg text-left transition-all hover:opacity-90"
                        style={{
                          background: quiz.done 
                            ? "rgba(34,211,165,0.08)" 
                            : isOverdue 
                              ? "rgba(239,68,68,0.08)" 
                              : isActive
                                ? "rgba(99,120,255,0.08)"
                                : "var(--surface2)",
                          border: `1.5px solid ${
                            quiz.done 
                              ? "rgba(34,211,165,0.3)" 
                              : isOverdue 
                                ? "rgba(239,68,68,0.3)" 
                                : isActive
                                  ? "rgba(99,120,255,0.3)"
                                  : "var(--border)"
                          }`,
                        }}
                      >
                        {/* Status indicator (not clickable) */}
                        <div className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center mt-0.5"
                          style={{
                            background: quiz.done ? "var(--green)" : "transparent",
                            border: `2px solid ${quiz.done ? "var(--green)" : isOverdue ? "#ef4444" : "#f59e0b"}`,
                          }}>
                          {quiz.done && (
                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded-md font-bold"
                              style={{
                                background: "var(--tint-accent)",
                                color: "var(--accent)",
                              }}>
                              Week {quiz.weekId.replace("week-", "")}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-md font-bold"
                              style={{
                                background: isOverdue ? "rgba(239,68,68,0.15)" : "rgba(255,193,7,0.15)",
                                color: isOverdue ? "#ef4444" : "#f59e0b",
                              }}>
                              {isOverdue ? "OVERDUE" : quiz.dateLabel}
                            </span>
                          </div>
                          <p className="text-xs font-medium mb-1 line-clamp-2"
                            style={{
                              color: quiz.done ? "var(--muted)" : isOverdue ? "#ef4444" : "var(--text)",
                              textDecoration: quiz.done ? "line-through" : "none",
                            }}>
                            {quiz.ref}
                          </p>
                          <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                            {quiz.subject} • {quiz.module}
                          </p>
                        </div>

                        {/* Arrow indicator */}
                        <div className="flex-shrink-0 mt-1">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--muted)" }}>
                            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {allQuizzes.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                      No quizzes found
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
