"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUser, toggleLecture, toggleManualLectureRef, toggleBacklogModuleIgnore } from "@/lib/store";
import { formatHours } from "@/lib/pace";
import { calculateBacklog } from "@/lib/backlog";
import type { WeekData } from "@/lib/backlog";
import type { Subject } from "@/lib/courseLoader";

export default function BacklogClient({ subjects, weeks }: { subjects: Subject[]; weeks: WeekData[] }) {
  const router = useRouter();
  const [completedMap, setCompletedMap] = useState<Record<string, number | false>>({});
  const [manualLectureRefs, setManualLectureRefs] = useState<Record<string, number | false>>({});
  const [ignoredBacklogModules, setIgnoredBacklogModules] = useState<Record<string, boolean>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace("/"); return; }
    getUser(u).then((data) => {
      setCompletedMap(data.completedLectures);
      setManualLectureRefs(data.manualLectureRefs ?? {});
      setIgnoredBacklogModules(data.ignoredBacklogModules ?? {});
      setIsLoading(false);
    });
  }, [router]);

  const lectureLookup = useMemo(() => {
    const map = new Map<string, { lectureName: string; duration: number }>();
    subjects.forEach(s => s.modules.forEach(m => m.lectures.forEach(l => map.set(l.id, { lectureName: l.title, duration: l.duration ?? 0 }))));
    return map;
  }, [subjects]);

  const backlog = useMemo(() => calculateBacklog(weeks, completedMap, manualLectureRefs, ignoredBacklogModules, lectureLookup), [weeks, completedMap, manualLectureRefs, ignoredBacklogModules, lectureLookup]);

  async function handleToggleDone(manualKey: string, id?: string) {
    const u = getCurrentUser();
    if (!u) return;
    setManualLectureRefs(prev => ({ ...prev, [manualKey]: prev[manualKey] ? false : Date.now() }));
    await toggleManualLectureRef(u, manualKey, !manualLectureRefs[manualKey]);
    if (id) {
      const next = await toggleLecture(u, id);
      setCompletedMap(prev => ({ ...prev, [id]: next }));
    }
  }

  async function handleToggleIgnore(subject: string, module: string) {
    const u = getCurrentUser();
    if (!u) return;
    const key = `${subject}|${module}`.toLowerCase();
    const currentValue = !!ignoredBacklogModules[key];
    const nextValue = !currentValue;
    setIsSyncing(key);
    setIgnoredBacklogModules(prev => ({ ...prev, [key]: nextValue }));
    try {
      await toggleBacklogModuleIgnore(u, key, nextValue);
    } catch {
      setIgnoredBacklogModules(prev => ({ ...prev, [key]: currentValue }));
    } finally {
      setIsSyncing(null);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2" style={{ borderColor: "var(--accent) transparent transparent transparent" }}></div>
      </div>
    );
  }

  const SUBJECT_COLORS: Record<string, string> = {
    "Engineering Mathematics": "#6378ff", "Discrete Mathematics": "#22d3a5",
    "Aptitude": "#f59e0b", "Operating Systems": "#f97316", "Computer Networks": "#06b6d4",
    "DBMS": "#a78bfa", "Algorithms": "#34d399", "Theory of Computation": "#fb7185",
    "Digital Logic": "#fbbf24", "COA": "#60a5fa",
  };
  function getColor(name: string) {
    for (const [k, v] of Object.entries(SUBJECT_COLORS)) {
      if (name.toLowerCase().includes(k.toLowerCase())) return v;
    }
    return "#8b5cf6";
  }

  return (
    <div className="min-h-screen pb-12" style={{ background: "var(--bg)" }}>
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 fade-in">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-2 glass rounded-xl hover:bg-white/10 transition-all" style={{ color: "var(--muted)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Dashboard
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-bold grad-text">Backlog Management</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">
              {backlog.totalLectures} lectures · {formatHours(backlog.focusedHours)} focused
            </p>
          </div>
          <div className="w-[88px] hidden sm:block" />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-8 fade-in-1">
          <div className="glass p-5 text-center rounded-2xl border border-white/10">
            <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{formatHours(backlog.focusedHours)}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-40 mt-1">Focused Backlog</p>
          </div>
          <div className="glass p-5 text-center rounded-2xl border border-white/10">
            <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{formatHours(backlog.totalHours)}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-40 mt-1">Total Lapsed</p>
          </div>
        </div>

        {/* Backlog List */}
        {backlog.totalLectures === 0 ? (
          <div className="glass p-12 text-center rounded-3xl fade-in-2" style={{ border: "1px dashed var(--border)" }}>
            <p className="text-4xl mb-4">⭐</p>
            <h2 className="text-2xl font-bold mb-2">No backlog!</h2>
            <p className="text-sm opacity-50">You're perfectly on schedule.</p>
          </div>
        ) : (
          <div className="space-y-8 fade-in-2">
            {Object.entries(backlog.structure).map(([subject, modules], si) => {
              const c = getColor(subject);
              return (
                <div key={subject} style={{ animationDelay: `${si * 0.05}s` }}>
                  <div className="flex items-center gap-3 mb-4 px-1">
                    <div className="w-1 h-6 rounded-full" style={{ background: c }} />
                    <h2 className="text-lg font-bold" style={{ color: c }}>{subject}</h2>
                    <span className="text-[10px] font-bold opacity-30 ml-auto">
                      {Object.values(modules).reduce((a, l) => a + l.length, 0)} pending
                    </span>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(modules).map(([module, lectures]) => {
                      const mKey = `${subject}|${module}`.toLowerCase();
                      const isIgnored = !!ignoredBacklogModules[mKey];
                      const isExpanded = !!expandedModules[mKey];
                      const syncing = isSyncing === mKey;

                      return (
                        <div key={module} className={`glass rounded-2xl border transition-all overflow-hidden ${isIgnored ? 'opacity-40 grayscale border-white/5' : 'border-white/10'}`}>
                          {/* Module Header */}
                          <div className="flex items-center gap-3 py-3 px-4">
                            <button className="flex items-center gap-3 flex-1 min-w-0"
                              onClick={() => setExpandedModules(p => ({ ...p, [mKey]: !p[mKey] }))}>
                              <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} style={{ color: "var(--muted)" }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                              </div>
                              <div className="min-w-0 text-left">
                                <p className="text-sm font-bold truncate">{module}</p>
                                <p className="text-[9px] opacity-40 font-bold">{lectures.length} pending</p>
                              </div>
                            </button>
                            <button disabled={syncing} onClick={() => handleToggleIgnore(subject, module)}
                              className={`p-2 rounded-lg transition-all flex-shrink-0 ${isIgnored ? 'text-accent bg-accent/10' : 'text-white/20 hover:text-white/50'} ${syncing ? 'animate-pulse' : ''}`}
                              title={isIgnored ? "Restore" : "Defer"}>
                              {isIgnored ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-80z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                              )}
                            </button>
                          </div>

                          {/* Lectures */}
                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-1 fade-in">
                              {lectures.map((l) => {
                                const isDone = (l.id && !!completedMap[l.id]) || !!manualLectureRefs[l.manualKey];
                                return (
                                  <div key={l.manualKey} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isDone ? 'bg-green-500/10' : 'bg-black/10 hover:bg-black/20'}`}>
                                    <button onClick={() => handleToggleDone(l.manualKey, l.id)}
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${isDone ? 'bg-green-500 text-black' : 'border border-white/15 hover:border-green-500/40'}`}>
                                      {isDone ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                      ) : (
                                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20" />
                                      )}
                                    </button>
                                    <p className={`text-xs font-medium truncate flex-1 ${isDone ? 'line-through opacity-40' : ''}`}>{l.name}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
