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
import { calculateBacklog } from "@/lib/backlog";
import type { WeekData } from "@/lib/backlog";
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
  const [recentAiChat, setRecentAiChat] = useState<any[] | null>(null);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [manualLectureRefs, setManualLectureRefs] = useState<Record<string, number | false>>({});
  const [ignoredBacklogModules, setIgnoredBacklogModules] = useState<Record<string, boolean>>({});
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [todayActivityExpanded, setTodayActivityExpanded] = useState<Record<string, boolean>>({});
  const [backlogDetailsExpanded, setBacklogDetailsExpanded] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace("/"); return; }
    setUsername(u);
    getUser(u).then((data) => {
      setCompletedMap(data.completedLectures);
      setManualLectureRefs(data.manualLectureRefs ?? {});
      setIgnoredBacklogModules(data.ignoredBacklogModules ?? {});
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

  // Backlog calculation (Schedule-based)
  const { 
    totalHours: totalBacklogHours, 
    totalLectures: totalBacklogLectures, 
    focusedHours: focusedBacklogHours,
    elapsedLectures,
    doneLectures,
    elapsedHours,
    doneHours,
    subjectBreakdown,
    completedCatalogIds
  } = calculateBacklog(
    weeks,
    completedMap,
    manualLectureRefs,
    ignoredBacklogModules
  );

  const hoursDone = [...coreLectureIdSet]
    .filter((id) => completedCatalogIds.has(id))
    .reduce((s, id) => s + (durationMap[id] ?? 0) / 3600, 0);
  const hoursRemaining = Math.max(0, totalCoreHours - hoursDone);
  const totalDone = [...coreLectureIdSet].filter((id) => completedCatalogIds.has(id)).length;
  const totalAll = coreLectureIdSet.size;
  const overallPct = totalCoreHours > 0 ? Math.round((hoursDone / totalCoreHours) * 100) : 0;

  const totalPlannedLectures = weeks.flatMap(w => w.days.flatMap(d => d.tasks.flatMap(t => t.lectureIds))).length;
  const totalDoneLectures = totalDone;

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
                <div className="relative">
                  <ProgressBar value={hoursDone} total={totalCoreHours} formatValue={formatHours} />
                  {/* Overall Target Marker */}
                  {totalCoreHours > 0 && (
                    <div 
                      className="absolute top-[21px] bottom-0 w-[2px] bg-white/30 z-10 pointer-events-none"
                      style={{ left: `${(elapsedHours / totalCoreHours) * 100}%`, height: '6px' }}
                      title="Schedule Target"
                    />
                  )}
                </div>
              </div>

              {/* Backlog */}
              <div className="glass p-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
                  Schedule Health
                </p>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-2xl font-bold"
                      style={{ color: focusedBacklogHours > 0 ? "var(--red)" : totalBacklogHours > 0 ? "var(--orange)" : "var(--green)" }}>
                      {focusedBacklogHours > 0 
                        ? `-${formatHours(focusedBacklogHours)}` 
                        : totalBacklogHours > 0 
                          ? "Deferred" 
                          : "On track"}
                    </p>
                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                      {focusedBacklogHours > 0 ? "Focused Backlog" : "Backlog Status"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold" style={{ color: "var(--text)" }}>{Math.round((doneHours / (elapsedHours || 1)) * 100)}%</p>
                    <p className="text-[10px] uppercase tracking-wider font-bold opacity-40" style={{ color: "var(--text)" }}>Schedule Pct</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {formatHours(doneHours)} / {formatHours(elapsedHours)} done
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {doneLectures} / {elapsedLectures} L
                  </span>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                   <div className="flex-1 mr-4">
                      <ProgressBar 
                        value={doneHours} 
                        total={elapsedHours} 
                        color={focusedBacklogHours > 0 ? "var(--red)" : "var(--accent)"} 
                      />
                   </div>
                    <Link
                      href="/backlog"
                      className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 glass rounded-lg hover:bg-white/10 transition-all flex items-center gap-1.5"
                      style={{ background: "var(--tint-accent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                      Backlog
                    </Link>
                </div>
              </div>

              {/* Today's tasks */}
              {(() => {
                const todayStr = new Date().toISOString().split("T")[0];
                const todayTasks = weeks.flatMap((w) => w.days.filter((d) => d.date === todayStr).flatMap((d) => d.tasks));
                const todayIds = todayTasks.flatMap((t) => t.lectureIds);
                const todayDone = todayIds.filter((id) => completedCatalogIds.has(id)).length;
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

            {/* ── Today's Activity vs Plan ── */}
            {(() => {
              const todayStr = new Date().toISOString().split("T")[0];
              const todayTasks = weeks.flatMap((w) => w.days.filter((d) => d.date === todayStr).flatMap((d) => d.tasks));
              
              // Get today's completed lectures from completedMap (lectures marked as done today)
              const todayCompleted = Object.entries(completedMap)
                .filter(([id, timestamp]) => {
                  if (!timestamp) return false;
                  const completedDate = new Date(timestamp as number).toISOString().split("T")[0];
                  return completedDate === todayStr;
                })
                .map(([id]) => id);
              
              const allTodayCompleted = new Set(todayCompleted);
              
              // Build lecture details map
              const lectureDetailsMap = new Map<string, { title: string; subjectName: string; moduleName: string; duration: number }>();
              for (const subject of subjects) {
                for (const mod of subject.modules) {
                  for (const lecture of mod.lectures) {
                    lectureDetailsMap.set(lecture.id, {
                      title: lecture.title,
                      subjectName: subject.name,
                      moduleName: mod.name,
                      duration: lecture.duration || 0,
                    });
                  }
                }
              }
              
              // Group completed lectures by subject
              const completedBySubject: Record<string, { lectures: Array<{ id: string; title: string; moduleName: string; duration: number }>; totalHours: number }> = {};
              
              for (const lectureId of allTodayCompleted) {
                const details = lectureDetailsMap.get(lectureId);
                if (!details) continue;
                
                if (!completedBySubject[details.subjectName]) {
                  completedBySubject[details.subjectName] = { lectures: [], totalHours: 0 };
                }
                
                completedBySubject[details.subjectName].lectures.push({
                  id: lectureId,
                  title: details.title,
                  moduleName: details.moduleName,
                  duration: details.duration,
                });
                completedBySubject[details.subjectName].totalHours += details.duration / 3600;
              }
              
              // Group planned tasks by subject
              const plannedBySubject: Record<string, { hours: number; modules: Set<string>; lectureIds: string[] }> = {};
              for (const task of todayTasks) {
                if (!plannedBySubject[task.subject]) {
                  plannedBySubject[task.subject] = { hours: 0, modules: new Set(), lectureIds: [] };
                }
                plannedBySubject[task.subject].hours += task.hours;
                plannedBySubject[task.subject].modules.add(task.module);
                plannedBySubject[task.subject].lectureIds.push(...task.lectureIds);
              }
              
              const hasActivity = allTodayCompleted.size > 0;
              const hasPlan = todayTasks.length > 0;
              
              // Calculate average daily performance from all elapsed days
              const currentBacklogHours = focusedBacklogHours > 0 ? focusedBacklogHours : totalBacklogHours;
              
              // Backlog tracking started on May 5, 2026
              const backlogTrackingStartDate = "2026-05-05";
              
              // Get elapsed days count (days that have passed in the schedule)
              const elapsedDaysCount = weeks.flatMap(w => w.days).filter(d => d.date <= todayStr).length;
              
              // Get days since backlog tracking started
              const trackingDays = weeks.flatMap(w => w.days).filter(d => d.date >= backlogTrackingStartDate && d.date <= todayStr);
              const trackingDaysCount = trackingDays.length;
              
              // Calculate total done and planned hours since tracking started
              const trackingDoneHours = (() => {
                let total = 0;
                for (const [lectureId, timestamp] of Object.entries(completedMap)) {
                  if (!timestamp) continue;
                  const completedDate = new Date(timestamp as number).toISOString().split("T")[0];
                  if (completedDate >= backlogTrackingStartDate && completedDate <= todayStr) {
                    const duration = durationMap[lectureId] || 0;
                    total += duration / 3600;
                  }
                }
                return total;
              })();
              
              const trackingPlannedHours = trackingDays.reduce((sum, day) => 
                sum + day.tasks.reduce((s, t) => s + t.hours, 0), 0
              );
              
              // Calculate today's hours and backlog metrics
              const todayCompletedHours = Object.values(completedBySubject).reduce((s, d) => s + d.totalHours, 0);
              const todayPlannedHours = todayTasks.reduce((s, t) => s + t.hours, 0);
              const todayBacklogReduction = todayCompletedHours - todayPlannedHours;
              
              // Calculate average daily surplus (done hours - planned hours per day) since tracking started
              const avgDailySurplus = trackingDaysCount > 0 
                ? (trackingDoneHours - trackingPlannedHours) / trackingDaysCount 
                : todayBacklogReduction;
              
              // Show section if there's activity OR if there's backlog coverage data to show
              const hasBacklogCoverage = avgDailySurplus > 0 && currentBacklogHours > 0;
              
              if (!hasActivity && !hasPlan && !hasBacklogCoverage) return null;
              
              // Calculate backlog coverage based on average performance since May 5th
              const backlogCoverageDays = avgDailySurplus > 0
                ? Math.ceil(currentBacklogHours / avgDailySurplus)
                : null;
              
              const backlogCoverageWeeks = backlogCoverageDays ? Math.ceil(backlogCoverageDays / 7) : null;
              
              // Calculate estimated backlog clearance date
              const backlogClearanceDate = backlogCoverageDays && avgDailySurplus > 0
                ? (() => {
                    const date = new Date();
                    date.setDate(date.getDate() + backlogCoverageDays);
                    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                  })()
                : null;
              
              return (
                <div className="glass p-5 mb-5 fade-in-2">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 rounded-full" style={{ background: "linear-gradient(to bottom, var(--accent), var(--accent2))" }} />
                      <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                        Today's Activity
                      </p>
                    </div>
                    <Link href="/activity" className="text-xs font-medium hover:underline flex items-center gap-1" style={{ color: "var(--accent)" }}>
                      View All Activity
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </Link>
                  </div>
                  
                  {!hasActivity && hasPlan ? (
                    <div className="text-center py-6">
                      <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>No lectures completed yet today</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {todayTasks.length} task{todayTasks.length !== 1 ? "s" : ""} planned · {todayPlannedHours.toFixed(2)} hrs
                      </p>
                    </div>
                  ) : !hasActivity && !hasPlan && hasBacklogCoverage ? (
                    <div className="text-center py-4">
                      <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>No activity today yet</p>
                    </div>
                  ) : hasActivity ? (
                    <div className="space-y-3">
                      {/* Summary stats */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="rounded-lg p-3 text-center" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                          <div className="text-xl font-bold mb-1" style={{ color: "var(--accent)" }}>
                            {allTodayCompleted.size}
                          </div>
                          <div className="text-xs" style={{ color: "var(--muted)" }}>Lectures</div>
                        </div>
                        <div className="rounded-lg p-3 text-center" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                          <div className="text-xl font-bold mb-1" style={{ color: "var(--green)" }}>
                            {todayCompletedHours.toFixed(2)}
                          </div>
                          <div className="text-xs" style={{ color: "var(--muted)" }}>Hrs Done</div>
                        </div>
                        <div className="rounded-lg p-3 text-center" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                          <div className="text-xl font-bold mb-1" style={{ color: hasPlan ? "var(--orange)" : "var(--muted)" }}>
                            {hasPlan ? todayPlannedHours.toFixed(2) : "—"}
                          </div>
                          <div className="text-xs" style={{ color: "var(--muted)" }}>Planned</div>
                        </div>
                        <div className="rounded-lg p-3 text-center" style={{ 
                          background: todayBacklogReduction > 0 ? "var(--tint-green)" : todayBacklogReduction < 0 ? "var(--tint-red)" : "var(--surface2)", 
                          border: `1px solid ${todayBacklogReduction > 0 ? "var(--green)" : todayBacklogReduction < 0 ? "var(--red)" : "var(--border)"}` 
                        }}>
                          <div className="text-xl font-bold mb-1" style={{ 
                            color: todayBacklogReduction > 0 ? "var(--green)" : todayBacklogReduction < 0 ? "var(--red)" : "var(--text)" 
                          }}>
                            {todayBacklogReduction > 0 ? "+" : ""}{todayBacklogReduction.toFixed(2)}
                          </div>
                          <div className="text-xs" style={{ color: "var(--muted)" }}>Backlog Δ</div>
                        </div>
                      </div>
                      
                      {/* Backlog Coverage Metrics */}
                      {avgDailySurplus > 0 && currentBacklogHours > 0 && (
                        <div className="rounded-lg p-4" style={{ background: "var(--surface2)", border: "1px solid var(--green)" }}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--green)" }}>
                              📊 Backlog Coverage Analysis
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                              <p className="text-2xl font-bold mb-1" style={{ color: "var(--green)" }}>
                                {backlogCoverageDays}
                              </p>
                              <p className="text-xs" style={{ color: "var(--muted)" }}>
                                Days to clear
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold mb-1" style={{ color: "var(--green)" }}>
                                {backlogCoverageWeeks}
                              </p>
                              <p className="text-xs" style={{ color: "var(--muted)" }}>
                                Weeks (~)
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold mb-1" style={{ color: "var(--text)" }}>
                                {backlogClearanceDate}
                              </p>
                              <p className="text-xs" style={{ color: "var(--muted)" }}>
                                Est. clearance
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                            <div className="flex items-center justify-between text-xs">
                              <span style={{ color: "var(--muted)" }}>Total backlog:</span>
                              <span className="font-bold" style={{ color: "var(--text)" }}>{currentBacklogHours.toFixed(2)} hrs</span>
                            </div>
                            <div className="flex items-center justify-between text-xs mt-1">
                              <span style={{ color: "var(--muted)" }}>Today's pace:</span>
                              <span className="font-bold" style={{ color: todayBacklogReduction >= 0 ? "var(--green)" : "var(--red)" }}>
                                {todayBacklogReduction >= 0 ? "+" : ""}{todayBacklogReduction.toFixed(2)} hrs
                              </span>
                            </div>
                            <button
                              onClick={() => setBacklogDetailsExpanded(!backlogDetailsExpanded)}
                              className="w-full flex items-center justify-between text-xs mt-1 py-1 hover:opacity-80 transition-all"
                            >
                              <span style={{ color: "var(--muted)" }}>Overall progress (since May 5):</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold" style={{ color: avgDailySurplus >= 0 ? "var(--green)" : "var(--red)" }}>
                                  {avgDailySurplus >= 0 ? "+" : ""}{avgDailySurplus.toFixed(2)} hrs/day avg
                                </span>
                                <svg 
                                  style={{ 
                                    transform: backlogDetailsExpanded ? "rotate(180deg)" : "rotate(0deg)", 
                                    transition: "transform 0.2s", 
                                    color: "var(--muted)" 
                                  }}
                                  width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            </button>
                            
                            {backlogDetailsExpanded && (() => {
                              // Build daily breakdown (only since May 5)
                              const backlogTrackingStartDate = "2026-05-05";
                              const dailyBreakdown: Array<{
                                date: string;
                                label: string;
                                planned: number;
                                done: number;
                                delta: number;
                              }> = [];
                              
                              // Get days since tracking started
                              const trackingDays = weeks.flatMap(w => w.days).filter(d => d.date >= backlogTrackingStartDate && d.date <= todayStr);
                              
                              // Build a map of date -> total hours done that day (any lectures)
                              const dailyDoneHours: Record<string, number> = {};
                              
                              // Go through all completed lectures and group by completion date
                              for (const [lectureId, timestamp] of Object.entries(completedMap)) {
                                if (!timestamp) continue;
                                const completedDate = new Date(timestamp as number).toISOString().split("T")[0];
                                if (completedDate >= backlogTrackingStartDate) {
                                  const duration = durationMap[lectureId] || 0;
                                  const hours = duration / 3600;
                                  
                                  if (!dailyDoneHours[completedDate]) {
                                    dailyDoneHours[completedDate] = 0;
                                  }
                                  dailyDoneHours[completedDate] += hours;
                                }
                              }
                              
                              for (const day of trackingDays) {
                                const dayPlanned = day.tasks.reduce((s, t) => s + t.hours, 0);
                                const dayDone = dailyDoneHours[day.date] || 0;
                                
                                dailyBreakdown.push({
                                  date: day.date,
                                  label: day.label,
                                  planned: dayPlanned,
                                  done: dayDone,
                                  delta: dayDone - dayPlanned,
                                });
                              }
                              
                              // Reverse to show most recent first
                              dailyBreakdown.reverse();
                              
                              return (
                                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>
                                    Daily Breakdown (since May 5 - {trackingDaysCount} days)
                                  </p>
                                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1" style={{ scrollbarWidth: "thin" }}>
                                    {dailyBreakdown.map((day) => (
                                      <div key={day.date} className="flex items-center justify-between text-xs py-2 px-2 rounded" 
                                        style={{ 
                                          background: day.date === todayStr ? "var(--surface)" : "var(--surface2)",
                                          border: day.date === todayStr ? "1px solid var(--accent)" : "none"
                                        }}>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold truncate" style={{ color: day.date === todayStr ? "var(--accent)" : "var(--text)" }}>
                                            {day.date === todayStr ? "Today" : day.label}
                                          </p>
                                          <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                                            {day.done.toFixed(2)} done / {day.planned.toFixed(2)} planned
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-2">
                                          <span className="font-bold px-2 py-0.5 rounded" style={{ 
                                            color: day.delta >= 0 ? "var(--green)" : "var(--red)",
                                            background: day.delta >= 0 ? "var(--tint-green)" : "var(--tint-red)"
                                          }}>
                                            {day.delta >= 0 ? "+" : ""}{day.delta.toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 pt-2 flex items-center justify-between text-xs" style={{ borderTop: "1px solid var(--border)" }}>
                                    <span className="font-semibold" style={{ color: "var(--text)" }}>Total (since May 5):</span>
                                    <span className="font-bold" style={{ color: (trackingDoneHours - trackingPlannedHours) >= 0 ? "var(--green)" : "var(--red)" }}>
                                      {(trackingDoneHours - trackingPlannedHours) >= 0 ? "+" : ""}{(trackingDoneHours - trackingPlannedHours).toFixed(2)} hrs
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                      
                      {todayBacklogReduction < 0 && (
                        <div className="rounded-lg p-3 text-center" style={{ background: "var(--tint-red)", border: "1px solid var(--red)" }}>
                          <p className="text-xs font-semibold mb-1" style={{ color: "var(--red)" }}>
                            ⚠ Adding to backlog
                          </p>
                          <p className="text-xs" style={{ color: "var(--muted)" }}>
                            You're {Math.abs(todayBacklogReduction).toFixed(2)} hrs behind today's plan
                          </p>
                        </div>
                      )}
                      
                      {/* Subject-wise breakdown */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                          Subject Breakdown
                        </p>
                        {Object.entries(completedBySubject).map(([subjectName, data]) => {
                          const planned = plannedBySubject[subjectName];
                          const plannedHours = planned?.hours || 0;
                          const completedHours = data.totalHours;
                          const progress = plannedHours > 0 ? Math.min(100, (completedHours / plannedHours) * 100) : 100;
                          const c = subjectColor(subjectName);
                          const isExpanded = todayActivityExpanded[subjectName] ?? false;
                          
                          return (
                            <div key={subjectName} className="rounded-lg overflow-hidden" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                              {/* Subject header - clickable */}
                              <button
                                onClick={() => setTodayActivityExpanded(prev => ({ ...prev, [subjectName]: !prev[subjectName] }))}
                                className="w-full p-3 transition-all hover:opacity-90"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 rounded-full" style={{ background: c }} />
                                    <span className="text-sm font-semibold" style={{ color: c }}>
                                      {subjectName}
                                    </span>
                                    <svg 
                                      style={{ 
                                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", 
                                        transition: "transform 0.2s", 
                                        color: "var(--muted)" 
                                      }}
                                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold" style={{ color: "var(--green)" }}>
                                      {completedHours.toFixed(2)} hrs
                                    </span>
                                    {plannedHours > 0 && (
                                      <>
                                        <span className="text-xs" style={{ color: "var(--muted)" }}>/</span>
                                        <span className="text-xs" style={{ color: "var(--muted)" }}>
                                          {plannedHours.toFixed(2)} planned
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Progress bar if planned */}
                                {plannedHours > 0 && (
                                  <div className="h-1.5 rounded-full" style={{ background: "var(--surface)" }}>
                                    <div className="h-1.5 rounded-full transition-all duration-500"
                                      style={{
                                        width: `${progress}%`,
                                        background: progress >= 100 ? "var(--green)" : c,
                                      }} />
                                  </div>
                                )}
                              </button>
                              
                              {/* Collapsible content */}
                              {isExpanded && (
                                <div className="px-3 pb-3 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                                  {/* Lectures list */}
                                  <div className="space-y-1 mt-2">
                                    {data.lectures.map((lecture) => (
                                      <div key={lecture.id} className="flex items-center justify-between text-xs py-1 px-2 rounded"
                                        style={{ background: "var(--surface)" }}>
                                        <span className="truncate flex-1" style={{ color: "var(--text)" }}>
                                          {lecture.title}
                                        </span>
                                        <span className="ml-2 flex-shrink-0" style={{ color: "var(--muted)" }}>
                                          {(lecture.duration / 3600).toFixed(2)} hrs
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {/* Module info */}
                                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                                    {data.lectures.length} lecture{data.lectures.length !== 1 ? "s" : ""} · {new Set(data.lectures.map(l => l.moduleName)).size} module{new Set(data.lectures.map(l => l.moduleName)).size !== 1 ? "s" : ""}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Planned but not completed */}
                      {hasPlan && (() => {
                        const notCompleted = Object.entries(plannedBySubject).filter(
                          ([subject]) => !completedBySubject[subject]
                        );
                        
                        if (notCompleted.length === 0) return null;
                        
                        return (
                          <div className="rounded-lg p-3" style={{ background: "var(--surface2)", border: "1px solid var(--orange)" }}>
                            <p className="text-xs font-semibold mb-2" style={{ color: "var(--orange)" }}>
                              ⚠ Planned but not started
                            </p>
                            <div className="space-y-1">
                              {notCompleted.map(([subject, data]) => (
                                <div key={subject} className="flex items-center justify-between text-xs py-1">
                                  <span style={{ color: "var(--text)" }}>{subject}</span>
                                  <span style={{ color: "var(--muted)" }}>
                                    {data.hours.toFixed(2)} hrs · {Array.from(data.modules).length} module{Array.from(data.modules).length !== 1 ? "s" : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>
              );
            })()}

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
                  const sb = subjectBreakdown[subject.name];
                  const lectures = subject.modules.flatMap((m) => m.lectures.filter((l) => l.isLecture));
                  const done = lectures.filter((l) => completedCatalogIds.has(l.id)).length;
                  const total = lectures.length;
                  const doneHrs = lectures.filter((l) => completedCatalogIds.has(l.id)).reduce((s, l) => s + (durationMap[l.id] ?? 0) / 3600, 0);
                  const totalHrs = subjectTotalHours[subject.id] ?? 0;
                  const plannedHrs = subjectPlannedHours[subject.id] ?? 0;
                  const pct = totalHrs > 0 ? Math.round((doneHrs / totalHrs) * 100) : 0;
                  const targetPct = (sb && totalHrs > 0) ? Math.min(100, (sb.elapsedHours / totalHrs) * 100) : 0;
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
                          <div className="h-1.5 rounded-full mb-1.5 relative overflow-hidden" style={{ background: "var(--surface2)" }}>
                            {/* Target shaded area */}
                            {targetPct > 0 && (
                              <div className="absolute inset-y-0 left-0 bg-white/5 transition-all duration-500" 
                                style={{ width: `${targetPct}%`, borderRight: '1px dashed rgba(255,255,255,0.2)' }} 
                              />
                            )}
                            <div className="h-1.5 rounded-full transition-all duration-500 relative z-10"
                              style={{
                                width: `${pct}%`,
                                background: pct === 100
                                  ? "linear-gradient(90deg, var(--green), var(--accent))"
                                  : `linear-gradient(90deg, ${c}, ${c}99)`,
                              }} />
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-bold" style={{ color: "var(--green)" }}>
                              ✓ {formatHours(doneHrs)}
                            </span>
                            {plannedHrs > 0 && (
                              <span className="text-xs" style={{ color: "var(--accent)" }}>
                                📅 {formatHours(plannedHrs)} total
                              </span>
                            )}
                            {(() => {
                              if (!sb) return null;
                              
                              return (
                                <>
                                  {sb.elapsedHours > 0 && (
                                    <span className="text-xs opacity-60" style={{ color: "var(--text)" }}>
                                      • {Math.round((sb.doneHours / sb.elapsedHours) * 100)}% week
                                    </span>
                                  )}
                                  {sb.totalHours > 0 && (
                                    <span className="text-xs font-bold" style={{ color: sb.focusedHours <= 0 ? "var(--orange)" : "var(--red)" }}>
                                      {sb.focusedHours <= 0 ? "⟳ Defer" : `⚠ -${formatHours(sb.focusedHours)}`}
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                            <span className="text-xs" style={{ color: "var(--muted)" }}>
                              {formatHours(totalHrs)} hrs · {done}/{total} L
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
