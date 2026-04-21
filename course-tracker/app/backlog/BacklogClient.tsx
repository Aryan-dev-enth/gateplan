"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUser, toggleLecture, toggleManualLectureRef, toggleBacklogModuleIgnore } from "@/lib/store";
import { formatHours } from "@/lib/pace";
import { calculateBacklog } from "@/lib/backlog";
import type { WeekData } from "@/lib/backlog";
import type { Subject } from "@/lib/courseLoader";

const SUBJECT_COLORS: Record<string, string> = {
  "Engineering Mathematics": "#6378ff",
  "Discrete Mathematics":    "#22d3a5",
  "Aptitude":                "#f59e0b",
  "Operating Systems":       "#f97316",
  "Computer Networks":       "#06b6d4",
  "DBMS":                    "#a78bfa",
  "Algorithms":              "#34d399",
  "Theory of Computation":   "#fb7185",
  "Digital Logic":           "#fbbf24",
  "COA":                     "#60a5fa",
};

function getSubjectColor(name: string): string {
  for (const [k, v] of Object.entries(SUBJECT_COLORS)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return "#8b5cf6";
}

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

  // Lookup map for lecture details
  const lectureLookup = useMemo(() => {
    const map = new Map<string, { subjectName: string; moduleName: string; lectureName: string; duration: number }>();
    subjects.forEach(s => {
      s.modules.forEach(m => {
        m.lectures.forEach(l => {
          map.set(l.id, { 
            subjectName: s.name, 
            moduleName: m.name, 
            lectureName: l.name, 
            duration: l.duration ?? 0 
          });
        });
      });
    });
    return map;
  }, [subjects]);

  const backlog = useMemo(() => {
    return calculateBacklog(
      weeks,
      completedMap,
      manualLectureRefs,
      ignoredBacklogModules,
      lectureLookup
    );
  }, [weeks, completedMap, manualLectureRefs, ignoredBacklogModules, lectureLookup]);

  async function handleToggleDone(manualKey: string, id?: string) {
    const u = getCurrentUser();
    if (!u) return;
    setManualLectureRefs(prev => ({ ...prev, [manualKey]: Date.now() }));
    await toggleManualLectureRef(u, manualKey, true);
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
    } catch (error) {
      console.error("Sync error:", error);
      setIgnoredBacklogModules(prev => ({ ...prev, [key]: currentValue }));
    } finally {
      setIsSyncing(null);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent" style={{ borderColor: "var(--accent) transparent transparent transparent" }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12" style={{ background: "var(--bg)" }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 fade-in">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-2 glass rounded-xl hover:bg-white/10 transition-all" style={{ color: "var(--muted)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Dashboard
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-bold grad-text">Backlog Management</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40" style={{ color: "var(--text)" }}>Control Center</p>
          </div>
          <div className="w-[88px] hidden sm:block" />
        </div>

        {/* Multi-Level Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 fade-in-1">
          <div className="glass p-6 text-center border-l-4 border-accent" style={{ borderColor: "var(--accent)" }}>
             <p className="text-3xl font-bold mb-1" style={{ color: "var(--accent)" }}>{formatHours(backlog.focusedHours)}</p>
             <p className="text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: "var(--text)" }}>Focused Backlog</p>
             <p className="text-[9px] opacity-40 mt-1 italic">Items you intend to finish now</p>
          </div>
          <div className="glass p-6 text-center border-l-4 border-white/20">
             <p className="text-3xl font-bold mb-1" style={{ color: "var(--text)" }}>{formatHours(backlog.totalHours)}</p>
             <p className="text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: "var(--text)" }}>Total Lapsed Hours</p>
             <p className="text-[9px] opacity-40 mt-1 italic">Everything missed so far</p>
          </div>
        </div>

        {/* Explorer */}
        {backlog.totalLectures === 0 ? (
          <div className="glass p-12 text-center rounded-3xl" style={{ border: "1px dashed var(--border)" }}>
            <p className="text-4xl mb-4">⭐</p>
            <h2 className="text-2xl font-bold mb-2">No backlog items!</h2>
            <p className="text-sm opacity-50">Your schedule is perfectly up to date.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(backlog.structure).map(([subject, modules], si) => {
              const c = getSubjectColor(subject);
              return (
                <div key={subject} className="fade-in" style={{ animationDelay: `${si * 0.1}s` }}>
                  <div className="flex items-center gap-3 mb-6 px-2">
                    <div className="w-1.5 h-7 rounded-full" style={{ background: c }} />
                    <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>{subject}</h2>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(modules).map(([module, lectures]) => {
                      const mKey = `${subject}|${module}`.toLowerCase();
                      const isIgnored = !!ignoredBacklogModules[mKey];
                      const isExpanded = !!expandedModules[mKey];
                      const syncing = isSyncing === mKey;
                      
                      return (
                        <div key={module} 
                             className={`glass transition-all duration-300 overflow-hidden border ${isIgnored ? 'opacity-50 grayscale bg-black/40' : 'border-white/10'}`}
                             style={{ borderRadius: "24px" }}>
                          
                          {/* Isolated Header */}
                          <div className="flex items-center justify-between py-4 px-5">
                            <div className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer" 
                                 onClick={() => setExpandedModules(p => ({...p, [mKey]: !p[mKey]}))}>
                               <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} style={{ color: "var(--muted)" }}>
                                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                   <polyline points="6 9 12 15 18 9"></polyline>
                                 </svg>
                               </div>
                               <div className="min-w-0">
                                 <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{module}</p>
                                 <p className="text-[10px] opacity-40 font-bold uppercase" style={{ color: "var(--text)" }}>{lectures.length} Pending</p>
                               </div>
                            </div>

                            <button 
                              type="button"
                              disabled={syncing}
                              onClick={() => handleToggleIgnore(subject, module)}
                              className={`ml-4 p-3 rounded-2xl flex items-center justify-center transition-all border ${
                                isIgnored 
                                  ? 'bg-accent/20 border-accent/40 text-accent' 
                                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/80'
                              } ${syncing ? 'animate-pulse opacity-50' : ''}`}
                            >
                              {isIgnored ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-80z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                              ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                  <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                              )}
                            </button>
                          </div>

                          {/* Content */}
                          {isExpanded && (
                             <div className="px-3 pb-3 space-y-1.5 fade-in">
                               {lectures.map((l) => (
                                 <div key={l.manualKey} className="flex items-center justify-between p-3.5 bg-black/10 rounded-2xl hover:bg-black/20 transition-colors">
                                    <div className="min-w-0 pr-4">
                                      <p className="text-xs font-semibold truncate mb-1" style={{ color: "var(--text)" }}>{l.name}</p>
                                      <span className="text-[9px] opacity-30 font-bold uppercase tracking-widest">{l.manualKey.split('|')[0]}</span>
                                    </div>
                                    <button 
                                      onClick={() => handleToggleDone(l.manualKey, l.id)}
                                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:border-green-500/50 hover:bg-green-500/10"
                                      style={{ color: "var(--green)" }}
                                    >
                                      <div className="w-5 h-5 rounded-full border-2 border-white/20" />
                                    </button>
                                 </div>
                               ))}
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
