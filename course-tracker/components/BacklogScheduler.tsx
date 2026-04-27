"use client";
import { useState, useMemo, useEffect } from "react";
import { BacklogStructure, WeekData } from "@/lib/backlog";
import { generateDynamicSchedule } from "@/lib/backlogScheduler";
import { formatHours } from "@/lib/pace";

interface BacklogSchedulerProps {
  structure: BacklogStructure;
  ignoredModules: Record<string, boolean>;
  onToggleDone: (manualKey: string, id?: string) => Promise<void>;
  completedCatalogIds: Set<string>;
  manualLectureRefs: Record<string, number | false>;
  weeks: WeekData[];
  completedMap: Record<string, number | false>;
  lectureLookup: Map<string, { duration: number }>;
}

export default function BacklogScheduler({ 
  structure, 
  ignoredModules, 
  onToggleDone,
  completedCatalogIds,
  manualLectureRefs,
  weeks,
  completedMap,
  lectureLookup
}: BacklogSchedulerProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const schedule = useMemo(() => {
    return generateDynamicSchedule(weeks, structure, ignoredModules, completedMap, lectureLookup);
  }, [weeks, structure, ignoredModules, completedMap, lectureLookup]);

  if (!isClient || schedule.days.length === 0) return null;

  return (
    <div className="mb-12 fade-in-1">
      <div className="flex flex-col md:flex-row items-end justify-between gap-4 mb-6 px-2">
        <div>
          <h2 className="text-xl font-bold grad-text mb-1">Recovery Roadmap</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40" style={{ color: "var(--text)" }}>
            Based on your recent {schedule.averagePace.toFixed(1)}h/day pace
          </p>
        </div>
        <div className="flex gap-3 text-right">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">Full Recovery</p>
            <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
              {schedule.completionDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {schedule.days.map((day) => (
          <div key={day.date} className={`glass overflow-hidden transition-all border ${day.isToday ? 'border-accent/30 bg-accent/5' : 'border-white/5'}`} style={{ borderRadius: "24px" }}>
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <p className={`text-sm font-bold ${day.isToday ? 'text-accent' : 'text-white/80'}`}>{day.label}</p>
                {day.isToday && <span className="px-2 py-0.5 rounded-full bg-accent text-[8px] font-bold uppercase text-black">Today</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold opacity-30 uppercase tracking-tighter">Target: {day.totalHours.toFixed(1)}h</span>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Weekly Tasks (Extra Stuff) */}
              {day.plannedTasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-30 px-1">Planned Weekly Tasks</p>
                  {day.plannedTasks.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl border border-white/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <div className="min-w-0 flex-1">
                         <p className="text-[10px] font-bold opacity-50 uppercase tracking-tighter">{t.subject}</p>
                         <p className="text-[11px] font-semibold truncate">{t.name}</p>
                      </div>
                      <span className="text-[9px] font-bold opacity-30">{t.hours}h</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Backlog Coverage */}
              {day.backlogTasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-30 px-1" style={{ color: "var(--accent)" }}>Backlog Recovery</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {day.backlogTasks.map((l) => {
                      const isDone = (l.id && completedCatalogIds.has(l.id)) || !!manualLectureRefs[l.manualKey];
                      return (
                        <div key={l.manualKey} className={`flex items-center justify-between p-3 rounded-xl transition-all border ${isDone ? 'bg-green-500/10 border-green-500/20 opacity-50' : 'bg-black/20 border-white/5 hover:border-accent/30'}`}>
                          <div className="min-w-0 pr-2">
                            <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter truncate">{l.subject}</p>
                            <p className="text-[11px] font-semibold truncate" style={{ color: isDone ? 'var(--green)' : 'var(--text)' }}>{l.name}</p>
                          </div>
                          <button 
                            onClick={() => !isDone && onToggleDone(l.manualKey, l.id)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isDone ? 'bg-green-500 text-black' : 'bg-white/5 border border-white/10'}`}
                          >
                            {isDone ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
