"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUser, logout, saveUser, deleteStudySession } from "@/lib/store";
import type { StudySession } from "@/lib/store";
import ProgressBar from "@/components/ProgressBar";
import EtaCard from "@/components/EtaCard";
import ScheduleSlider from "@/components/ScheduleSlider";
import { formatHours } from "@/lib/pace";
import type { Subject } from "@/lib/courseLoader";
import type { WeekData } from "@/app/weekly/page";
import { saveDailySummary } from "@/lib/store";

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = "12px" }: { w?: string; h?: string }) {
  return (
    <div className="rounded-md animate-pulse"
      style={{ width: w, height: h, background: "var(--surface2)" }} />
  );
}

function MetricSkeleton() {
  return (
    <div className="glass p-5 flex flex-col gap-3">
      <Skeleton w="60%" h="10px" />
      <Skeleton w="40%" h="28px" />
      <Skeleton w="80%" h="10px" />
      <Skeleton h="6px" />
    </div>
  );
}

function SubjectSkeleton() {
  return (
    <div className="glass p-4 flex items-center gap-3">
      <Skeleton w="40px" h="40px" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton w="55%" h="14px" />
        <Skeleton w="80%" h="8px" />
        <Skeleton h="6px" />
      </div>
      <Skeleton w="36px" h="20px" />
    </div>
  );
}

// ── Subject color map ─────────────────────────────────────────────────────────
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

function subjectColor(name: string): string {
  for (const [k, v] of Object.entries(SUBJECT_COLORS)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return "#8b5cf6";
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardClient({
  subjects,
  durationMap,
  subjectPlannedHours,
  subjectTotalHours,
  totalCoreHours,
  weeks,
}: {
  subjects: Subject[];
  durationMap: Record<string, number>;
  subjectPlannedHours: Record<string, number>;
  subjectTotalHours: Record<string, number>;
  totalCoreHours: number;
  weeks: WeekData[];
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [completedMap, setCompletedMap] = useState<Record<string, number | false>>({});
  const [backlogOpen, setBacklogOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [targetDate, setTargetDate] = useState<string | undefined>(undefined);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [recentAiChat, setRecentAiChat] = useState<any[] | null>(null);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace("/"); return; }
    setUsername(u);
    getUser(u).then((data) => {
      setCompletedMap(data.completedLectures);
      setTargetDate(data.targetDate);
      setStudySessions(data.studySessions ?? []);
      setRecentAiChat(data.recentAiChat ?? null);
      setIsLoading(false);
    }).catch(() => {
      setCompletedMap({});
      setRecentAiChat(null);
      setIsLoading(false);
    });
  }, [router]);

  async function handleTargetDateChange(date: string) {
    const u = getCurrentUser();
    if (!u) return;
    const data = await getUser(u);
    data.targetDate = date || undefined;
    await saveUser(u, data);
    setTargetDate(date || undefined);
  }

  function handleSignOut() {
    if (!confirm("Sign out?")) return;
    logout();
    router.replace("/");
  }

  const coreSubjects = subjects.filter((s) => s.tag !== "extra");
  const extraSubjects = subjects.filter((s) => s.tag === "extra");

  const coreLectureIdSet = new Set(
    coreSubjects.flatMap((s) =>
      s.modules.flatMap((m) => m.lectures.filter((l) => l.isLecture).map((l) => l.id))
    )
  );

  const hoursDone = [...coreLectureIdSet]
    .filter((id) => !!completedMap[id])
    .reduce((s, id) => s + (durationMap[id] ?? 0) / 3600, 0);
  const hoursRemaining = Math.max(0, totalCoreHours - hoursDone);
  const totalDone = [...coreLectureIdSet].filter((id) => !!completedMap[id]).length;
  const totalAll = coreLectureIdSet.size;
  const overallPct = totalCoreHours > 0 ? Math.round((hoursDone / totalCoreHours) * 100) : 0;

  // Backlog calculation
  const calculateBacklog = () => {
    const backlogData: Record<string, { plannedHours: number; completedHours: number; backlogHours: number; lectures: number }> = {};
    let totalBacklogHours = 0;
    let totalBacklogLectures = 0;
    const today = new Date().toISOString().split("T")[0];
    const plannedHoursBySubject: Record<string, number> = {};

    weeks.forEach(week => {
      if (week.days.some(day => day.date <= today)) {
        week.days.forEach(day => {
          day.tasks.forEach(task => {
            plannedHoursBySubject[task.subject] = (plannedHoursBySubject[task.subject] ?? 0) + task.hours;
          });
        });
      }
    });

    coreSubjects.forEach(subject => {
      const lectures = subject.modules.flatMap((m) => m.lectures.filter((l) => l.isLecture));
      const doneHrs = lectures.filter((l) => !!completedMap[l.id]).reduce((s, l) => s + (durationMap[l.id] ?? 0) / 3600, 0);
      const plannedHrs = plannedHoursBySubject[subject.name] || 0;
      const backlogHrs = Math.max(0, plannedHrs - doneHrs);
      if (backlogHrs > 0) {
        backlogData[subject.name] = {
          plannedHours: plannedHrs,
          completedHours: doneHrs,
          backlogHours: backlogHrs,
          lectures: lectures.filter((l) => !completedMap[l.id]).length,
        };
        totalBacklogHours += backlogHrs;
        totalBacklogLectures += lectures.filter((l) => !completedMap[l.id]).length;
      }
    });

    return { backlogData, totalBacklogHours, totalBacklogLectures };
  };

  const { backlogData, totalBacklogHours, totalBacklogLectures } = calculateBacklog();

  const totalPlannedLectures = weeks.flatMap(w => w.days.flatMap(d => d.tasks.flatMap(t => t.lectureIds))).length;
  const totalDoneLectures = [...coreLectureIdSet].filter((id) => !!completedMap[id]).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-6 fade-in">
          <h1 className="text-base font-bold">
            <span className="grad-text">GatePlan</span>
            <span style={{ color: "var(--text)" }}> Dashboard</span>
          </h1>
          {!isLoading && (
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: "var(--muted)" }}>· {username}</span>
              <Link href="/summary" className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 glass rounded-lg hover:bg-white/10 transition-all flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
                <span className="text-xs">📅</span> Summary View
              </Link>
            </div>
          )}
        </div>

        {isLoading ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <MetricSkeleton /><MetricSkeleton /><MetricSkeleton />
            </div>
            <div className="flex flex-col gap-3">
              <SubjectSkeleton /><SubjectSkeleton /><SubjectSkeleton />
            </div>
          </>
        ) : (
          <>
            {/* ── Metrics row ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 fade-in-1">

              {/* Overall progress */}
              <div className="glass p-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
                  Overall Progress
                </p>
                <div className="flex items-end justify-between mb-3">
                  <span className="text-3xl font-bold" style={{ color: "var(--accent)" }}>{overallPct}%</span>
                  <div className="text-right">
                    <p className="text-xl font-bold" style={{ color: "var(--accent2)" }}>{Math.round(hoursDone + overallPct)} pts</p>
                    <p className="text-[10px] uppercase tracking-wider font-bold opacity-40" style={{ color: "var(--text)" }}>Points</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {formatHours(hoursDone)} / {formatHours(totalCoreHours)}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {totalDone} / {totalAll} lectures
                  </span>
                </div>
                <ProgressBar value={hoursDone} total={totalCoreHours} formatValue={formatHours} />
              </div>

              {/* Backlog */}
              <div className="glass p-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
                  Weekly Backlog
                </p>
                <div className="flex items-end justify-between mb-3">
                  <span className="text-3xl font-bold"
                    style={{ color: totalBacklogHours > 0 ? "var(--red)" : "var(--green)" }}>
                    {totalBacklogHours > 0 ? formatHours(totalBacklogHours) : "On track"}
                  </span>
                  {totalBacklogHours > 0 && (
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {totalBacklogLectures} lectures
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {totalDoneLectures} / {totalPlannedLectures} planned done
                  </span>
                  {totalBacklogHours > 0 && (
                    <button
                      onClick={() => setBacklogOpen((v) => !v)}
                      className="text-xs px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
                      style={{ background: "var(--tint-accent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                      {backlogOpen ? "Hide" : "Details"}
                    </button>
                  )}
                </div>
              </div>

              {/* Today's tasks */}
              {(() => {
                const todayStr = new Date().toISOString().split("T")[0];
                const todayTasks = weeks.flatMap((w) => w.days.filter((d) => d.date === todayStr).flatMap((d) => d.tasks));
                const todayIds = todayTasks.flatMap((t) => t.lectureIds);
                const todayDone = todayIds.filter((id) => !!completedMap[id]).length;
                const todayTotal = todayIds.length;
                const todayHours = todayTasks.reduce((s, t) => s + t.hours, 0);
                const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : null;
                return (
                  <div className="glass p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
                      Today's Plan
                    </p>
                    {todayTasks.length === 0 ? (
                      <p className="text-sm" style={{ color: "var(--muted)" }}>No tasks scheduled today</p>
                    ) : (
                      <>
                        <div className="flex items-end justify-between mb-3">
                          <span className="text-3xl font-bold"
                            style={{ color: todayPct === 100 ? "var(--green)" : "var(--accent)" }}>
                            {todayPct !== null ? `${todayPct}%` : "—"}
                          </span>
                          <span className="text-xs" style={{ color: "var(--muted)" }}>
                            {formatHours(todayHours)} planned
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full mb-2" style={{ background: "var(--surface2)" }}>
                          <div className="h-1.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${todayPct ?? 0}%`,
                              background: todayPct === 100
                                ? "linear-gradient(90deg, var(--green), var(--accent))"
                                : "linear-gradient(90deg, var(--accent), var(--accent2))",
                            }} />
                        </div>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          {todayDone} / {todayTotal} lectures · {todayTasks.length} task{todayTasks.length !== 1 ? "s" : ""}
                        </p>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ── Recent AI Chat Snippet ── */}
            {recentAiChat && recentAiChat.length > 0 && (
              <div className="glass p-5 mb-5 fade-in-2 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full" style={{ background: "linear-gradient(to bottom, var(--accent), var(--accent2))" }} />
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--muted)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Recent AI Assistant Insight
                  </p>
                  <Link href="/ai" className="text-xs font-medium hover:underline flex flex-row items-center gap-1" style={{ color: "var(--accent)" }}>
                    Open Chat
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentAiChat.map((msg: any, i: number) => (
                    <div key={i} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-start border-l-2 pl-3" : "items-start bg-black/5 dark:bg-white/5 p-3 rounded-lg"}`} style={{ borderColor: "var(--border)" }}>
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: msg.role === "user" ? "var(--muted)" : "var(--accent)" }}>
                        {msg.role === "user" ? "You asked" : "AI Assistant"}
                      </span>
                      <p className="text-xs leading-relaxed max-h-[80px] overflow-hidden text-ellipsis opacity-90" style={{ color: "var(--text)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                        {msg.content.replace(/\*+/g, "").substring(0, 300)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Backlog detail ── */}
            {backlogOpen && (
              <div className="mb-5 fade-in">
                {totalBacklogHours > 0 ? (
                  <div className="glass p-4 flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                      Backlog breakdown
                    </p>
                    {Object.entries(backlogData).map(([name, data]) => {
                      const c = subjectColor(name);
                      const pct = data.plannedHours > 0 ? Math.round((data.completedHours / data.plannedHours) * 100) : 0;
                      return (
                        <div key={name} className="rounded-xl p-3"
                          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
                              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{name}</span>
                            </div>
                            <span className="text-sm font-bold" style={{ color: "var(--red)" }}>
                              -{formatHours(data.backlogHours)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs mb-2" style={{ color: "var(--muted)" }}>
                            <span>Planned {formatHours(data.plannedHours)}</span>
                            <span style={{ color: "var(--green)" }}>Done {formatHours(data.completedHours)}</span>
                            <span>{data.lectures} lectures left</span>
                          </div>
                          <div className="h-1 rounded-full" style={{ background: "var(--border)" }}>
                            <div className="h-1 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: c }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="glass p-4 text-center"
                    style={{ background: "var(--tint-green)", border: "1px solid var(--tint-green-border)" }}>
                    <p className="text-sm font-medium" style={{ color: "var(--green)" }}>🎉 You're on track with the weekly plan</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Two-col: Schedule slider + ETA full ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 fade-in-2">
              <ScheduleSlider />
              <EtaCard
                completedMap={completedMap}
                durationMap={durationMap}
                hoursRemaining={hoursRemaining}
                hoursTotal={totalCoreHours}
                lectureIdSet={coreLectureIdSet}
                weeks={weeks}
                targetDate={targetDate}
                onTargetDateChange={handleTargetDateChange}
                compact={false}
                subjectData={Object.fromEntries(coreSubjects.map(s => [s.id, {
                  totalHours: subjectTotalHours[s.id] ?? 0,
                  plannedHours: subjectPlannedHours[s.id] ?? 0,
                }]))}
                userId={username}
              />
            </div>

            {/* ── Core subjects ── */}
            <div className="mb-5 fade-in-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  Subjects
                  <span className="ml-2 text-xs font-normal" style={{ color: "var(--muted)" }}>
                    {coreSubjects.length} courses
                  </span>
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {coreSubjects.map((subject, si) => {
                  const lectures = subject.modules.flatMap((m) => m.lectures.filter((l) => l.isLecture));
                  const done = lectures.filter((l) => !!completedMap[l.id]).length;
                  const total = lectures.length;
                  const doneHrs = lectures.filter((l) => !!completedMap[l.id]).reduce((s, l) => s + (durationMap[l.id] ?? 0) / 3600, 0);
                  const totalHrs = subjectTotalHours[subject.id] ?? 0;
                  const plannedHrs = subjectPlannedHours[subject.id] ?? 0;
                  const pct = totalHrs > 0 ? Math.round((doneHrs / totalHrs) * 100) : 0;
                  const c = subjectColor(subject.name);

                  return (
                    <Link key={subject.id} href={`/subject/${subject.id}`}
                      className="glass p-4 transition-all hover:scale-[1.005] fade-in"
                      style={{ animationDelay: `${si * 0.03}s` }}>
                      <div className="flex items-center gap-3">
                        {/* Index / done badge */}
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{
                            background: pct === 100 ? "var(--tint-green)" : `${c}18`,
                            border: `1px solid ${pct === 100 ? "var(--tint-green-border)" : `${c}40`}`,
                            color: pct === 100 ? "var(--green)" : c,
                          }}>
                          {pct === 100 ? "✓" : si + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                              {subject.name}
                            </p>
                            <span className="text-sm font-bold flex-shrink-0 ml-2"
                              style={{ color: pct === 100 ? "var(--green)" : c }}>
                              {pct}%
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="h-1.5 rounded-full mb-1.5" style={{ background: "var(--surface2)" }}>
                            <div className="h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: pct === 100
                                  ? "linear-gradient(90deg, var(--green), var(--accent))"
                                  : `linear-gradient(90deg, ${c}, ${c}99)`,
                              }} />
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs" style={{ color: "var(--green)" }}>
                              ✓ {formatHours(doneHrs)}
                            </span>
                            {plannedHrs > 0 && (
                              <span className="text-xs" style={{ color: "var(--accent)" }}>
                                📅 {formatHours(plannedHrs)}
                              </span>
                            )}
                            <span className="text-xs" style={{ color: "var(--muted)" }}>
                              {formatHours(totalHrs)} total · {done}/{total} lectures
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* ── Extras ── */}
            {extraSubjects.length > 0 && (
              <div className="fade-in-3">
                <button
                  onClick={() => setExtrasOpen((v) => !v)}
                  className="flex items-center gap-2 text-sm font-semibold mb-3 hover:opacity-80 transition-all"
                  style={{ color: "var(--text)" }}>
                  <svg style={{ transform: extrasOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--muted)" }}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Extra Resources
                  <span className="text-xs font-normal" style={{ color: "var(--muted)" }}>
                    {extraSubjects.length} items
                  </span>
                </button>

                {extrasOpen && (
                  <div className="flex flex-col gap-2">
                    {extraSubjects.map((subject) => {
                      const lectures = subject.modules.flatMap((m) => m.lectures.filter((l) => l.isLecture));
                      const done = lectures.filter((l) => !!completedMap[l.id]).length;
                      const total = lectures.length;
                      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                      return (
                        <Link key={subject.id} href={`/subject/${subject.id}`}
                          className="glass p-4 transition-all hover:scale-[1.005]">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                              style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--accent)" }}>
                              ★
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{subject.name}</p>
                                <span className="text-sm font-bold ml-2" style={{ color: "var(--accent)" }}>{pct}%</span>
                              </div>
                              <div className="h-1.5 rounded-full mb-1" style={{ background: "var(--surface2)" }}>
                                <div className="h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent2))" }} />
                              </div>
                              <p className="text-xs" style={{ color: "var(--muted)" }}>{done}/{total} lectures</p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
