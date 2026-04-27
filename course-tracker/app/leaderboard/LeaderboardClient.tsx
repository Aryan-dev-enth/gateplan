"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/store";
import type { Subject } from "@/lib/courseLoader";
import { Trophy, Flame, Target, ChevronLeft, Award, Zap, Clock, Star, BarChart3 } from "lucide-react";

interface WeekData {
  weekId: string; label: string;
  days: { date: string; label: string; tasks: { subject: string; module: string; hours: number; lectureRefs: string[]; lectureIds: string[] }[] }[];
}

interface UserStats {
  username: string;
  totalHours: number;
  totalDone: number;
  totalLectures: number;
  pct: number;
  streak: number;
  todayHours: number;
  todayCount: number;
  weekHours: number;
  weekCount: number;
  avgDaily: number;
  isPhantom?: boolean;
  subjectProgress: { id: string; name: string; done: number; total: number; pct: number }[];
  recentActivity: { title: string; subjectName: string; timestamp: number }[];
}

const RANK_COLORS = ["#fbbf24", "#94a3b8", "#92400e", "#3b82f6", "#6366f1", "#06b6d4"];

function calcStreak(cm: Record<string, number | false>): number {
  const days = new Set(Object.values(cm).filter(Boolean).map(ts => new Date(ts as number).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    if (days.has(d.toDateString())) streak++; else if (i > 0) break;
  }
  return streak;
}

function timeAgo(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function buildAir1(weeks: WeekData[], subjects: Subject[], totalLectures: number): UserStats {
  const todayStr = new Date().toISOString().split("T")[0];
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const weekAgo = Date.now() - 7 * 86400000;

  const lectureMap = new Map<string, { duration: number; isLecture: boolean; subjectName: string; title: string }>();
  for (const s of subjects) for (const m of s.modules) for (const l of m.lectures) {
    lectureMap.set(l.id, { duration: l.duration, isLecture: l.isLecture, subjectName: s.name, title: l.title });
  }

  let totalHoursAir = 0, todayHoursAir = 0, weekHoursAir = 0;
  let totalDone = 0, todayCount = 0, weekCount = 0;
  const activeDays = new Set<string>();
  const completedIds = new Set<string>();

  for (const week of weeks) {
    for (const day of week.days) {
      if (day.date > todayStr) continue;
      const dayTs = new Date(day.date).setHours(9, 0, 0, 0);
      let dayHasWork = false;
      for (const task of day.tasks) {
        const taskHours = task.hours;
        const lectureCount = task.lectureIds.filter(id => id).length;
        let added = 0;
        for (const id of task.lectureIds) {
          if (!id || completedIds.has(id)) continue;
          completedIds.add(id); totalDone++; added++; dayHasWork = true;
          if (dayTs >= todayStart) todayCount++;
          if (dayTs >= weekAgo) weekCount++;
        }
        if (lectureCount > 0 && added > 0) {
          const h = (added / lectureCount) * taskHours;
          totalHoursAir += h;
          if (dayTs >= todayStart) todayHoursAir += h;
          if (dayTs >= weekAgo) weekHoursAir += h;
        }
      }
      if (dayHasWork) activeDays.add(day.date);
    }
  }

  const dayCount = activeDays.size || 1;
  const subjectDone = new Map<string, number>();
  for (const id of completedIds) {
    const meta = lectureMap.get(id);
    if (meta) subjectDone.set(meta.subjectName, (subjectDone.get(meta.subjectName) || 0) + 1);
  }
  const subjectProgress = subjects
    .map(s => {
      const total = s.modules.reduce((a, m) => a + m.lectures.length, 0);
      const done = subjectDone.get(s.name) || 0;
      return { id: s.id, name: s.name, done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
    }).filter(s => s.done > 0);

  return {
    username: "AIR 1", totalHours: totalHoursAir, totalDone, totalLectures,
    pct: totalLectures > 0 ? Math.round((totalDone / totalLectures) * 100) : 0,
    streak: dayCount, todayHours: todayHoursAir, todayCount,
    weekHours: weekHoursAir, weekCount, avgDaily: totalHoursAir / dayCount,
    isPhantom: true, subjectProgress, recentActivity: [],
  };
}

// Custom SVG Chart Component for Top 3
function TopThreeChart({ top3, tab }: { top3: UserStats[], tab: string }) {
  if (top3.length === 0) return null;
  
  const getScore = (u: UserStats) => {
    const s = tab === "today" ? u.todayHours : tab === "week" ? u.weekHours : u.totalHours;
    return typeof s === 'number' && !isNaN(s) ? Math.max(0, s) : 0;
  };

  // Reorder for Podium: [2nd, 1st, 3rd]
  const reordered = [top3[1], top3[0], top3[2]].filter(Boolean);
  const scores = top3.map(getScore);
  const maxScore = Math.max(...scores, 0.1);
  
  return (
    <div className="bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 mb-8 transition-all shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Performance Analytics</h2>
        </div>
        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
          Rank 1 in Center
        </span>
      </div>
      
      <div className="flex items-end justify-around h-52 gap-4 sm:gap-2 px-2 relative">
        {reordered.map((u, i) => {
          const score = getScore(u);
          const rank = top3.findIndex(user => user.username === u.username) + 1;
          const height = Math.max(15, (score / maxScore) * 100);
          const color = RANK_COLORS[rank - 1] || 'var(--accent)';
          const isFirst = rank === 1;
          
          // Calculate gap to the person ahead
          let gapText = "";
          if (rank === 2) {
            const diff = getScore(top3[0]) - score;
            gapText = `-${diff.toFixed(1)}h`;
          } else if (rank === 3) {
            const diff = getScore(top3[1]) - score;
            gapText = `-${diff.toFixed(1)}h`;
          }

          return (
            <div key={u.username} className="flex-1 flex flex-col items-center h-full group relative">
              {/* Gap Badge (Absolute positioned relative to bar) */}
              {gapText && (
                <div className="absolute top-1/2 -translate-y-1/2 bg-red-500/10 text-red-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-500/20 z-20 pointer-events-none"
                  style={{ [rank === 2 ? 'right' : 'left']: '-15%' }}>
                  {gapText}
                </div>
              )}

              {/* Score Tooltip */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded shadow-xl border border-white/10 whitespace-nowrap z-10 transition-transform group-hover:scale-110">
                {score.toFixed(1)}h
              </div>
              
              {/* Bar Wrapper */}
              <div className="flex-1 w-full flex flex-col items-center justify-end">
                <div 
                  className={`w-full ${isFirst ? 'max-w-[100px]' : 'max-w-[70px]'} rounded-t-2xl transition-all duration-700 ease-out relative overflow-hidden border-x border-t border-white/20`}
                  style={{ 
                    height: `${height}%`, 
                    background: color,
                    boxShadow: isFirst ? `0 10px 40px ${color}50` : `0 4px 20px ${color}30`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-black/20" />
                  {isFirst && <div className="absolute inset-0 animate-pulse bg-white/5" />}
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <p className={`text-[10px] font-black text-[var(--text)] truncate max-w-[80px] uppercase tracking-tighter ${isFirst ? 'text-xs' : ''}`}>
                  {u.username}
                </p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  <p className="text-[8px] font-black text-[var(--muted)] uppercase">Rank {rank}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LeaderboardClient({ subjects, weeks }: { subjects: Subject[]; weeks: WeekData[] }) {
  const router = useRouter();
  const [me, setMe] = useState("");
  const [users, setUsers] = useState<UserStats[]>([]);
  const [tab, setTab] = useState<"overall" | "today" | "week">("overall");
  const [selected, setSelected] = useState<string | null>("AIR 1");
  const [isLoading, setIsLoading] = useState(true);

  const lectureMap = useMemo(() => {
    const m = new Map<string, { title: string; subjectName: string; duration: number; isLecture: boolean }>();
    for (const s of subjects) for (const mod of s.modules) for (const l of mod.lectures)
      m.set(l.id, { title: l.title, subjectName: s.name, duration: l.duration, isLecture: l.isLecture });
    return m;
  }, [subjects]);

  const totalLectures = useMemo(() => subjects.reduce((s, sub) => s + sub.modules.reduce((ms, m) => ms + m.lectures.length, 0), 0), [subjects]);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) { router.replace("/"); return; }
    setMe(current);
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const weekStart = Date.now() - 7 * 86400000;

    fetch("/api/leaderboard")
      .then(r => r.json())
      .then((all: { username: string; completedLectures: Record<string, number | false> }[]) => {
        const stats: UserStats[] = all.map(({ username, completedLectures: cm }) => {
          const doneIds = Object.entries(cm).filter(([, v]) => !!v);
          const totalDone = doneIds.length;
          let totalSeconds = 0, todaySeconds = 0, weekSeconds = 0, todayCount = 0, weekCount = 0;
          const activeDaySet = new Set<string>();
          doneIds.forEach(([id, ts]) => {
            const meta = lectureMap.get(id);
            if (meta?.isLecture) {
              totalSeconds += meta.duration;
              activeDaySet.add(new Date(ts as number).toDateString());
              if ((ts as number) >= todayStart) { todaySeconds += meta.duration; todayCount++; }
              if ((ts as number) >= weekStart) { weekSeconds += meta.duration; weekCount++; }
            }
          });
          const pct = totalLectures === 0 ? 0 : Math.round((totalDone / totalLectures) * 100);
          const activeDays = activeDaySet.size || 1;
          const subjectProgress = subjects.map(s => {
            const total = s.modules.reduce((a, m) => a + m.lectures.length, 0);
            const done = s.modules.reduce((a, m) => a + m.lectures.filter(l => !!cm[l.id]).length, 0);
            return { id: s.id, name: s.name, done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
          }).filter(s => s.done > 0);
          const recentActivity = doneIds
            .map(([id, ts]) => { const meta = lectureMap.get(id); return meta ? { ...meta, timestamp: ts as number } : null; })
            .filter(Boolean).sort((a, b) => b!.timestamp - a!.timestamp).slice(0, 5) as { title: string; subjectName: string; timestamp: number }[];
          return {
            username, totalHours: totalSeconds / 3600, totalDone, totalLectures, pct,
            streak: calcStreak(cm), todayHours: todaySeconds / 3600, todayCount,
            weekHours: weekSeconds / 3600, weekCount, avgDaily: totalSeconds / 3600 / activeDays,
            subjectProgress, recentActivity,
          };
        });
        stats.push(buildAir1(weeks, subjects, totalLectures));
        stats.sort((a, b) => b.totalHours - a.totalHours);
        setUsers(stats);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [router, lectureMap, subjects, weeks, totalLectures]);

  const sorted = useMemo(() => [...users].sort((a, b) => {
    if (tab === "today") return b.todayHours - a.todayHours;
    if (tab === "week") return b.weekHours - a.weekHours;
    return b.totalHours - a.totalHours;
  }), [users, tab]);

  const getScore = (u: UserStats) => tab === "today" ? u.todayHours : tab === "week" ? u.weekHours : u.totalHours;
  const selectedUser = sorted.find(u => u.username === selected);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[var(--accent)]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] py-10 px-4 sm:px-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        
        {/* Header - Simple & Clean */}
        <header className="flex items-center justify-between mb-8 fade-in">
          <Link href="/dashboard" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
            <ChevronLeft className="w-3 h-3" /> Dashboard
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Leaderboard</h1>
            <p className="text-[10px] text-[var(--muted)] font-medium uppercase tracking-widest mt-1">Study Performance Ranking</p>
          </div>
          <div className="w-[80px]" />
        </header>

        {/* Tab Selection */}
        <div className="flex justify-center mb-10 fade-in-1">
          <div className="inline-flex bg-slate-900/5 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
            {(["overall", "today", "week"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${
                  tab === t 
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" 
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}>
                {t === "overall" ? "All Time" : t === "today" ? "Today" : "This Week"}
              </button>
            ))}
          </div>
        </div>

        {/* Top 3 Chart Section */}
        <div className="fade-in-1">
          <TopThreeChart top3={sorted.slice(0, 3)} tab={tab} />
        </div>

        {/* Simplified Podium - Compact Rank Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 fade-in-1">
          {[1, 0, 2].map(idx => {
            const user = sorted[idx];
            if (!user) return null;
            const rank = idx + 1;
            const score = getScore(user);
            const color = RANK_COLORS[idx];
            
            return (
              <div key={user.username} 
                className={`p-5 rounded-2xl flex items-center gap-4 cursor-pointer transition-all border ${
                  selected === user.username 
                    ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] bg-slate-100/50 dark:bg-white/5 shadow-lg' 
                    : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                }`}
                onClick={() => setSelected(user.username)}>
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-lg font-bold border border-slate-300 dark:border-slate-700">
                    {user.isPhantom ? <Star className="w-6 h-6 text-yellow-500" /> : user.username[0].toUpperCase()}
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-900 shadow-xl"
                    style={{ background: color, color: idx === 0 ? '#000' : '#fff' }}>
                    {rank}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate text-[var(--text)]">{user.username}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-black italic tracking-tight" style={{ color }}>{score.toFixed(1)}h</span>
                    <span className="text-[10px] text-[var(--muted)] uppercase font-bold">Logged</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compact List Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start fade-in-2">
          
          <div className="lg:col-span-8 space-y-2">
            {sorted.map((user, i) => {
              const isSelected = selected === user.username;
              const isMe = user.username === me;
              const score = getScore(user);
              const rankColor = i < 3 ? RANK_COLORS[i] : 'transparent';

              return (
                <div key={user.username}
                  className={`flex items-center gap-4 px-5 py-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 shadow-sm' 
                      : 'bg-white/40 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                  onClick={() => setSelected(user.username)}>
                  <div className="w-6 text-center text-xs font-black text-slate-400">
                    {i + 1}
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-sm font-bold border border-slate-300 dark:border-slate-700">
                    {user.isPhantom ? <Star className="w-4 h-4 text-yellow-500" /> : user.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate text-[var(--text)]">{user.username}</p>
                      {isMe && <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20">You</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <div className="flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5 text-orange-500" />
                        <span className="text-[9px] font-bold text-[var(--muted)]">{user.streak}d</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-2.5 h-2.5 text-blue-500 dark:text-blue-400" />
                        <span className="text-[9px] font-bold text-[var(--muted)]">{user.pct}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black italic tracking-tighter text-[var(--text)]">{score.toFixed(1)}h</p>
                  </div>
                  {i < 3 && <div className="w-1.5 h-1.5 rounded-full" style={{ background: rankColor }} />}
                </div>
              );
            })}
          </div>

          {/* Clean Detail Sidebar */}
          <aside className="lg:col-span-4 sticky top-6">
            {selectedUser ? (() => {
              const user = selectedUser;
              const idx = sorted.findIndex(u => u.username === user.username);
              const startedSubjects = user.subjectProgress.slice(0, 4);

              return (
                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 fade-in-3 shadow-lg">
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-2xl font-bold border border-slate-300 dark:border-slate-700 mb-3">
                      {user.isPhantom ? <Star className="w-8 h-8 text-yellow-500" /> : user.username[0].toUpperCase()}
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text)]">{user.username}</h3>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)] mt-1">Ranked #{idx + 1} Overall</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { l: "Avg/Day", v: `${user.avgDaily.toFixed(1)}h`, icon: Clock },
                      { l: "Streak", v: `${user.streak}d`, icon: Flame },
                    ].map((s, i) => (
                      <div key={i} className="bg-white dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-1.5 text-[var(--muted)] mb-1">
                          <s.icon className="w-2.5 h-2.5" />
                          <span className="text-[8px] font-black uppercase tracking-widest">{s.l}</span>
                        </div>
                        <p className="text-sm font-black italic text-[var(--text)]">{s.v}</p>
                      </div>
                    ))}
                  </div>

                  {/* Subject Focus */}
                  {startedSubjects.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                        <Target className="w-2.5 h-2.5" /> Mastery Distribution
                      </h4>
                      <div className="space-y-3">
                        {startedSubjects.map(sp => (
                          <div key={sp.id}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-bold text-[var(--muted)]">{sp.name}</span>
                              <span className="text-[10px] font-black text-[var(--text)]">{sp.pct}%</span>
                            </div>
                            <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-400 dark:bg-slate-500 rounded-full transition-all duration-700"
                                style={{ width: `${sp.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activity Feed */}
                  {user.recentActivity.length > 0 && (
                    <div className="mt-8">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)] mb-4">Recent Activity</h4>
                      <div className="space-y-2">
                        {user.recentActivity.slice(0, 3).map((a, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mt-1.5" />
                            <div className="min-w-0">
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{a.title}</p>
                              <p className="text-[8px] text-[var(--muted)] mt-0.5 uppercase font-bold">{timeAgo(a.timestamp)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200 dark:border-white/10 border-dashed rounded-2xl p-12 text-center transition-colors">
                <Trophy className="w-6 h-6 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">Selection Required</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
