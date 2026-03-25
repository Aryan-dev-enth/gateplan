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

export default function WeekSidebar({ 
  weeks, 
  subjects, 
  completedMap, 
  manualCompletedTasks, 
  onWeekSelect, 
  activeWeek 
}: WeekSidebarProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  // Calculate completion percentage for a task
  const getTaskCompletion = (task: TaskData, date?: string): boolean => {
    const mappedCount = task.lectureIds.length;
    const doneCount = task.lectureIds.filter((id) => !!completedMap[id]).length;
    const hasMapped = mappedCount > 0;
    const allDone = hasMapped && doneCount === mappedCount;
    
    // Check if manually completed
    const taskKey = `${date || 'unknown'}|${task.subject}|${task.module}|${task.lectureRefs.join('|')}|${task.hours}`;
    const isManuallyCompleted = manualCompletedTasks.has(taskKey);
    
    // Manual completion takes priority
    const isCompleted = isManuallyCompleted || (hasMapped && allDone);
    
    return isCompleted;
  };

  // Calculate week completion percentage
  const getWeekCompletion = (week: WeekData): number => {
    const totalTasks = week.days.reduce((sum: number, day: any) => sum + day.tasks.length, 0);
    const completedTasks = week.days.reduce((sum: number, day: any) => {
      return sum + day.tasks.filter((task: TaskData) => getTaskCompletion(task, day.date)).length;
    }, 0);
    
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  };

  // Get completion color based on percentage
  const getCompletionColor = (percentage: number): string => {
    if (percentage === 100) return "#10b981";
    if (percentage >= 75) return "#f59e0b";
    if (percentage >= 50) return "#f97316";
    if (percentage >= 25) return "#ef4444";
    return "#6b7280";
  };

  // Toggle week expansion
  const toggleWeek = (weekId: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekId)) {
      newExpanded.delete(weekId);
    } else {
      newExpanded.add(weekId);
      // Close other weeks
      expandedWeeks.forEach((id: string) => {
        if (id !== weekId) newExpanded.delete(id);
      });
    }
    setExpandedWeeks(newExpanded);
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 h-screen overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800">Weekly Progress</h2>
        <p className="text-sm text-gray-600 mt-1">Click on weeks to view details</p>
      </div>

      {/* Week Tabs */}
      <div className="p-4 space-y-2">
        {weeks.slice().reverse().map((week) => {
          const completion = getWeekCompletion(week);
          const isActive = activeWeek === week.weekId;
          const isExpanded = expandedWeeks.has(week.weekId);
          const [c1, c2] = getSubjectColor("Engineering Mathematics"); // Default color
          
          return (
            <div key={week.weekId} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Week Header */}
              <button
                onClick={() => {
                  onWeekSelect(week.weekId);
                  toggleWeek(week.weekId);
                }}
                className={`w-full p-3 text-left transition-all duration-200 flex items-center justify-between ${
                  isActive ? "ring-2 ring-blue-500" : "hover:bg-gray-50"
                }`}
                style={{
                  background: isActive ? getCompletionColor(completion) + "20" : "white",
                  borderLeft: `4px solid ${getCompletionColor(completion)}`
                }}
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{week.label}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {completion}% Complete
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: getCompletionColor(completion) }}
                  >
                    {completion}%
                  </div>
                  <svg 
                    className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Content - Subject Breakdown */}
              {isExpanded && (
                <div className="p-3 bg-gray-50 border-t border-gray-200">
                  <div className="space-y-2">
                    {/* Group tasks by subject */}
                    {Array.from(new Set(
                      week.days.flatMap((day: any) => day.tasks.map((task: TaskData) => task.subject))
                    )).map((subject: string) => {
                      const subjectTasks = week.days.flatMap((day: any) => 
                        day.tasks.filter((task: TaskData) => task.subject === subject)
                      );
                      const subjectCompleted = subjectTasks.filter((task: TaskData) => 
                        getTaskCompletion(task)
                      ).length;
                      const subjectPercentage = Math.round(
                        (subjectCompleted / subjectTasks.length) * 100
                      );
                      const [sColor1, sColor2] = getSubjectColor(subject);

                      return (
                        <div key={subject} className="bg-white p-2 rounded border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ background: `linear-gradient(135deg, ${sColor1}, ${sColor2})` }}
                              />
                              <span className="font-medium text-gray-700">{subject}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm text-gray-600">
                                {subjectCompleted}/{subjectTasks.length}
                              </div>
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                style={{ background: getCompletionColor(subjectPercentage) }}
                              >
                                {subjectPercentage}%
                              </div>
                            </div>
                          </div>
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

      {/* Legend */}
      <div className="p-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Completion Colors</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: "var(--green)" }} />
            <span>100% Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: "var(--yellow)" }} />
            <span>75-99% Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: "var(--orange)" }} />
            <span>50-74% Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: "var(--red)" }} />
            <span>25-49% Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: "var(--muted)" }} />
            <span>0-24% Complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}
