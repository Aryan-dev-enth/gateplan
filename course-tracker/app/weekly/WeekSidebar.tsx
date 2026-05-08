"use client";

import { useState } from "react";
import { WeekData, TaskData } from "@/lib/types";
import { Subject } from "@/lib/courseLoader";
import { getSubjectColor } from "@/lib/utils";

interface WeekSidebarProps {
  weeks: WeekData[];
  subjects: Subject[];
  completedMap: Record<string, number | false>;
  manualCompletedTasks: Set<string>;
  onWeekSelect: (weekId: string) => void;
  activeWeek: string;
}

function getCompletionColor(pct: number): string {
  if (pct === 100) return "var(--green)";
  if (pct >= 75) return "#f59e0b";
  if (pct >= 50) return "#f97316";
  if (pct >= 25) return "var(--red)";
  return "var(--muted)";
}

export default function WeekSidebar({
  weeks,
  completedMap,
  manualCompletedTasks,
  onWeekSelect,
  activeWeek,
}: WeekSidebarProps) {
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);


  const getWeekCompletion = (week: WeekData): number => {
    let totalHours = 0;
    let doneHours = 0;
    week.days.forEach((day) => {
      day.tasks.forEach((task, taskIdx) => {
        totalHours += task.hours;
        const tRefs = task.lectureRefs.length;
        if (tRefs > 0) {
          let tDone = 0;
          task.lectureRefs.forEach((ref, i) => {
            const lectureId = task.lectureIds?.[i];
            const manualKey = `${day.date}|${task.subject}|${task.module}|${taskIdx}|${i}|${ref}`;
            if ((lectureId && completedMap[lectureId]) || manualCompletedTasks.has(manualKey)) {
              tDone++;
            }
          });
          doneHours += (tDone / tRefs) * task.hours;
        }
      });
    });
    return totalHours > 0 ? Math.round((doneHours / totalHours) * 100) : 0;
  };

  const getWeekQuizzes = (week: WeekData): { total: number; done: number } => {
    let total = 0;
    let done = 0;
    week.days.forEach((day) => {
      day.tasks.forEach((task, taskIdx) => {
        task.lectureRefs.forEach((ref, i) => {
          if (/quiz/i.test(ref)) {
            total++;
            const lectureId = task.lectureIds?.[i];
            const manualKey = `${day.date}|${task.subject}|${task.module}|${taskIdx}|${i}|${ref}`;
            if ((lectureId && completedMap[lectureId]) || manualCompletedTasks.has(manualKey)) {
              done++;
            }
          }
        });
      });
    });
    return { total, done };
  };

  return (
    <div className="flex flex-col gap-2" style={{ width: "220px", flexShrink: 0 }}>
      <p className="text-xs font-semibold uppercase tracking-wider px-1 mb-1" style={{ color: "var(--muted)" }}>
        Weeks
      </p>

      {weeks.slice().reverse().map((week) => {
        const pct = getWeekCompletion(week);
        const quizzes = getWeekQuizzes(week);
        const isActive = activeWeek === week.weekId;
        const isExpanded = expandedWeek === week.weekId;
        const color = getCompletionColor(pct);

        // Subject breakdown
        const subjectMap = new Map<string, { totalHours: number; doneHours: number }>();
        week.days.forEach((day) => {
          day.tasks.forEach((task, taskIdx) => {
            const existing = subjectMap.get(task.subject) ?? { totalHours: 0, doneHours: 0 };
            existing.totalHours += task.hours;
            const tRefs = task.lectureRefs.length;
            if (tRefs > 0) {
              let tDone = 0;
              task.lectureRefs.forEach((ref, i) => {
                const lectureId = task.lectureIds?.[i];
                const manualKey = `${day.date}|${task.subject}|${task.module}|${taskIdx}|${i}|${ref}`;
                if ((lectureId && completedMap[lectureId]) || manualCompletedTasks.has(manualKey)) {
                  tDone++;
                }
              });
              existing.doneHours += (tDone / tRefs) * task.hours;
            }
            subjectMap.set(task.subject, existing);
          });
        });

        return (
          <div key={week.weekId} className="rounded-xl overflow-hidden transition-all"
            style={{
              border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
              background: isActive ? "var(--tint-accent)" : "var(--card-bg)",
            }}>
            <button
              className="w-full px-3 py-2.5 flex items-center gap-2 text-left transition-all hover:opacity-90"
              onClick={() => {
                onWeekSelect(week.weekId);
                setExpandedWeek(isExpanded ? null : week.weekId);
              }}
            >
              {/* Color bar */}
              <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ 
                      background: isActive ? "var(--accent)" : "var(--surface2)", 
                      color: isActive ? "white" : "var(--muted)" 
                    }}>
                    Week {week.weekId.replace("week-", "")}
                  </span>
                </div>
                <p className="text-xs font-semibold truncate" style={{ color: isActive ? "var(--accent)" : "var(--text)" }}>
                  {week.label}
                </p>
                {quizzes.total > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px]">📝</span>
                    <span className="text-[10px] font-medium" 
                      style={{ color: quizzes.done === quizzes.total ? "var(--green)" : "#f59e0b" }}>
                      {quizzes.done}/{quizzes.total} quizzes
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex-1 h-1 rounded-full" style={{ background: "var(--border)" }}>
                    <div className="h-1 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-xs flex-shrink-0 font-medium" style={{ color }}>
                    {pct}%
                  </span>
                </div>
              </div>

              <svg
                className="flex-shrink-0 transition-transform duration-200"
                style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", color: "var(--muted)" }}
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              >
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Subject breakdown */}
            {isExpanded && (
              <div className="px-3 pb-3 flex flex-col gap-1.5"
                style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-xs pt-2 mb-0.5 font-medium" style={{ color: "var(--muted)" }}>By subject</p>
                {Array.from(subjectMap.entries()).map(([subject, { totalHours, doneHours }]) => {
                  const sPct = totalHours > 0 ? Math.round((doneHours / totalHours) * 100) : 0;
                  const [c1] = getSubjectColor(subject);
                  return (
                    <div key={subject}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs truncate" style={{ color: "var(--text)", maxWidth: "130px" }}>
                          {subject.split(" ")[0]}
                        </span>
                        <span className="text-xs font-medium" style={{ color: c1 }}>
                          {doneHours.toFixed(1)}/{totalHours.toFixed(1)}h
                        </span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: "var(--border)" }}>
                        <div className="h-1 rounded-full transition-all duration-500"
                          style={{ width: `${sPct}%`, background: c1 }} />
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
  );
}
