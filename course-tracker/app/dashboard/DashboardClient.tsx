"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUser, logout, saveUser, deleteStudySession } from "@/lib/store";
import type { StudySession } from "@/lib/store";
import { PageSkeleton, MetricSkeleton, SubjectCardSkeleton, BacklogSkeleton } from "@/components/LoadingSkeleton";
import ProgressBar from "@/components/ProgressBar";
import ThemeToggle from "@/components/ThemeToggle";
import EtaCard from "@/components/EtaCard";
import { formatHours } from "@/lib/pace";
import type { Subject } from "@/lib/courseLoader";
import type { WeekData } from "@/app/weekly/page";

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
  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace("/"); return; }
    setUsername(u);
    getUser(u).then((data) => {
      setCompletedMap(data.completedLectures);
      setTargetDate(data.targetDate);
      setStudySessions(data.studySessions ?? []);
      setIsLoading(false);
    }).catch((error) => {
      console.error('Error loading user data:', error);
      // Handle database errors gracefully
      if (error.error?.includes('timeout') || error.error?.includes('Database')) {
        // Use fallback data
        setCompletedMap({});
        setTargetDate(undefined);
        setStudySessions([]);
      }
      setIsLoading(false);
    });
  }, [router]);

  async function handleDeleteSession(sessionId: string) {
    const u = getCurrentUser();
    if (!u) return;
    await deleteStudySession(u, sessionId);
    setStudySessions((prev) => prev.filter((s) => s.id !== sessionId));
  }

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

  // Calculate backlog based on current date and past weeks only
  const calculateBacklog = () => {
    const backlogData: Record<string, { plannedHours: number; completedHours: number; backlogHours: number; lectures: number }> = {};
    let totalBacklogHours = 0;
    let totalBacklogLectures = 0;
    const today = new Date().toISOString().split("T")[0];
    
    // Calculate planned hours from weeks up to today only
    const plannedHoursBySubject: Record<string, number> = {};
    weeks.forEach(week => {
      // Check if any day in this week is today or in the past
      const weekHasCurrentOrPast = week.days.some(day => day.date <= today);
      
      if (weekHasCurrentOrPast) {
        week.days.forEach(day => {
          day.tasks.forEach(task => {
            if (!plannedHoursBySubject[task.subject]) {
              plannedHoursBySubject[task.subject] = 0;
            }
            plannedHoursBySubject[task.subject] += task.hours;
          });
        });
      }
    });
    
    // Calculate backlog for each subject based on past weeks only
    coreSubjects.forEach(subject => {
      const lectures = subject.modules.flatMap((m) => m.lectures.filter((l) => l.isLecture));
      const doneHrs = lectures.filter((l) => !!completedMap[l.id]).reduce((s, l) => s + (durationMap[l.id] ?? 0) / 3600, 0);
      const plannedHrs = plannedHoursBySubject[subject.name] || 0;
      
      // Backlog is what's planned but not yet completed (from past weeks only)
      const backlogHrs = Math.max(0, plannedHrs - doneHrs);
      
      if (backlogHrs > 0) {
        backlogData[subject.name] = {
          plannedHours: plannedHrs,
          completedHours: doneHrs,
          backlogHours: backlogHrs,
          lectures: lectures.filter((l) => !completedMap[l.id]).length
        };
        totalBacklogHours += backlogHrs;
        totalBacklogLectures += lectures.filter((l) => !completedMap[l.id]).length;
      }
    });

    return { backlogData, totalBacklogHours, totalBacklogLectures };
  };

  const { backlogData, totalBacklogHours, totalBacklogLectures } = calculateBacklog();

  // Calculate total planned lectures from ALL weeks in the schedule
  const totalPlannedLectures = weeks.flatMap(week => 
    week.days.flatMap(day => day.tasks.flatMap(task => task.lectureIds))
  ).length;

  const totalDoneLectures = [...coreLectureIdSet].filter((id) => !!completedMap[id]).length;

  // Today's variables for ETA card
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = weeks.flatMap((w) => w.days.filter((d) => d.date === todayStr).flatMap((d) => d.tasks));
  const todayMappedIds = todayTasks.flatMap((t) => t.lectureIds);
  const todayDone = todayMappedIds.filter((id) => !!completedMap[id]).length;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="glow-orb w-96 h-96 -top-32 -right-32" style={{ background: "rgba(99,120,255,0.08)" }} />
      <div className="glow-orb w-64 h-64 bottom-0 -left-32" style={{ background: "rgba(34,211,165,0.05)" }} />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">

        {/* Show loading skeleton while loading */}
        {isLoading ? (
          <PageSkeleton />
        ) : (
          <>
            {/* Nav */}
            <div className="flex items-center justify-between mb-8 fade-in">
              <div>
                <h1 className="text-2xl font-semibold grad-text">GatePlan</h1>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Welcome back, {username}</p>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-3">
                <Link href="/log-time"
                  className="px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 text-sm"
                  style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--accent)" }}>
                  ⏱ Log Time
                </Link>
                <Link href="/weekly" className="px-4 py-2 rounded-lg text-sm font-medium hover:scale-105 transition-all" style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--text)" }}>📅 Weekly</Link>
                <Link href="/activity" className="px-4 py-2 rounded-lg text-sm font-medium hover:scale-105 transition-all" style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--text)" }}>📊 Activity</Link>
                <Link href="/leaderboard" className="px-3 py-2 rounded-lg text-sm font-medium hover:scale-105 transition-all" style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--accent)" }}>🏆</Link>
                <ThemeToggle />
                <button onClick={handleSignOut} className="px-4 py-2 rounded-lg text-sm font-medium hover:scale-105 transition-all" style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--red)" }}>Sign out</button>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center gap-2">
                <ThemeToggle />
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-lg transition-all hover:scale-105"
                  style={{ background: "var(--tint-accent)", border: "1px solid var(--border)" }}
                >
                  <div className="w-5 h-5 flex flex-col justify-center items-center gap-1">
                    <div className={`w-4 h-0.5 rounded-full transition-all duration-300 ${mobileMenuOpen ? "rotate-45 translate-y-1.5" : ""}`} style={{ backgroundColor: "var(--text)" }}></div>
                    <div className={`w-4 h-0.5 rounded-full transition-all duration-300 ${mobileMenuOpen ? "opacity-0" : ""}`} style={{ backgroundColor: "var(--text)" }}></div>
                    <div className={`w-4 h-0.5 rounded-full transition-all duration-300 ${mobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} style={{ backgroundColor: "var(--text)" }}></div>
                  </div>
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden mb-6 fade-in">
                <div className="glass p-4 rounded-lg space-y-2">
                  <Link href="/log-time"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-4 py-3 rounded-lg font-medium transition-all hover:scale-105 text-sm"
                    style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--accent)" }}>
                    ⏱ Log Time
                  </Link>
                  <Link href="/weekly" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-4 py-3 rounded-lg text-sm font-medium hover:scale-105 transition-all" style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    📅 Weekly Plan
                  </Link>
                  <Link href="/activity" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-4 py-3 rounded-lg text-sm font-medium hover:scale-105 transition-all" style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    📊 Activity
                  </Link>
                  <Link href="/leaderboard" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-4 py-3 rounded-lg text-sm font-medium hover:scale-105 transition-all" style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--accent)" }}>
                    🏆 Leaderboard
                  </Link>
                  <button 
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full px-4 py-3 rounded-lg text-sm font-medium hover:scale-105 transition-all text-left" 
                    style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--red)" }}>
                    Sign out
                  </button>
                </div>
              </div>
            )}

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 fade-in-1">
              {/* Overall Progress */}
              <div className="glass p-6 text-center relative overflow-hidden">
                <div className="shimmer absolute inset-0 rounded-lg pointer-events-none" />
                <p className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>OVERALL PROGRESS</p>
                <div className="text-3xl font-semibold mb-2" style={{ color: "var(--accent)" }}>{overallPct}%</div>
                <p className="text-sm" style={{ color: "var(--muted)" }}>{formatHours(hoursDone)} / {formatHours(totalCoreHours)} hours</p>
                <div className="mt-3"><ProgressBar value={hoursDone} total={totalCoreHours} formatValue={formatHours} /></div>
              </div>

              {/* Weekly Plan Backlog */}
              <div className="glass p-4 md:p-6 text-center relative overflow-hidden">
                <div className="shimmer absolute inset-0 rounded-lg pointer-events-none" />
                <p className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>WEEKLY PLAN BACKLOG</p>
                <div className="text-2xl md:text-3xl font-semibold mb-2" style={{ color: totalBacklogHours > 0 ? "var(--red)" : "var(--green)" }}>
                  {totalBacklogHours > 0 ? formatHours(totalBacklogHours) : "0"}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-1 sm:gap-2 mb-3">
                  <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {totalDoneLectures}/{totalPlannedLectures}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    done/weekly planned
                  </span>
                </div>
                {totalBacklogHours > 0 && (
                  <div className="mt-2 md:mt-3">
                    <button 
                      onClick={() => {
                        setBacklogOpen(true);
                        // Scroll to backlog section
                        setTimeout(() => {
                          document.getElementById('backlog-section')?.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                          });
                        }, 100);
                      }}
                      className="text-xs font-medium px-3 py-1.5 md:py-1 rounded-md transition-all hover:scale-105 w-full sm:w-auto"
                      style={{ background: "var(--tint-accent)", color: "var(--accent)", border: "1px solid var(--border)" }}
                    >
                      View Details →
                    </button>
                  </div>
                )}
              </div>

              {/* ETA */}
              <div className="glass p-6 text-center relative overflow-hidden">
                <div className="shimmer absolute inset-0 rounded-lg pointer-events-none" />
                <p className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>ESTIMATED COMPLETION</p>
                <EtaCard
                  completedMap={completedMap}
                  durationMap={durationMap}
                  hoursRemaining={hoursRemaining}
                  hoursTotal={totalCoreHours}
                  lectureIdSet={coreLectureIdSet}
                  weeks={weeks}
                  targetDate={targetDate}
                  onTargetDateChange={handleTargetDateChange}
                  compact={true}
                  subjectData={Object.fromEntries(coreSubjects.map(s => [s.id, {
                    totalHours: subjectTotalHours[s.id] ?? 0,
                    plannedHours: subjectPlannedHours[s.id] ?? 0
                  }]))}
                  userId={username}
                />
              </div>
            </div>

            {/* Backlog Section */}
            <div id="backlog-section" className="mb-8 fade-in-2">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setBacklogOpen((v) => !v)}
                  className="flex items-center gap-2 text-base font-semibold hover:opacity-80 transition-all"
                  style={{ color: "var(--text)" }}>
                  <span style={{ display: "inline-block", transform: backlogOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>›</span>
                  📋 Total Weekly Plan Backlog
                </button>
                <div className="flex items-center gap-4">
                  {totalBacklogHours > 0 && (
                    <>
                      <span className="text-sm font-medium" style={{ color: "var(--red)" }}>
                        {formatHours(totalBacklogHours)} hours
                      </span>
                      <span className="text-sm" style={{ color: "var(--muted)" }}>
                        {totalBacklogLectures} lectures
                      </span>
                    </>
                  )}
                  {totalBacklogHours === 0 && (
                    <span className="text-sm" style={{ color: "var(--green)" }}>✓ On track</span>
                  )}
                </div>
              </div>
              {backlogOpen && totalBacklogHours > 0 && (
                <div className="flex flex-col gap-2">
                  {Object.entries(backlogData).map(([subjectName, data], index) => (
                    <div key={index} className="glass p-3" style={{ background: "rgba(220, 53, 69, 0.05)", border: "1px solid rgba(220, 53, 69, 0.1)" }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{subjectName}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs" style={{ color: "var(--muted)" }}>
                              Planned: {formatHours(data.plannedHours)}h
                            </span>
                            <span className="text-xs" style={{ color: "var(--green)" }}>
                              Done: {formatHours(data.completedHours)}h
                            </span>
                            <span className="text-xs font-medium" style={{ color: "var(--red)" }}>
                              Backlog: {formatHours(data.backlogHours)}h
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold" style={{ color: "var(--red)" }}>
                            {formatHours(data.backlogHours)}h
                          </p>
                          <p className="text-xs" style={{ color: "var(--muted)" }}>
                            {data.lectures} lectures
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {backlogOpen && totalBacklogHours === 0 && (
                <div className="glass p-4 text-center" style={{ background: "var(--tint-green)", border: "1px solid var(--tint-green-border)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--green)" }}>🎉</p>
                  <p className="text-sm font-medium mt-2" style={{ color: "var(--green)" }}>You're on track!</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Current progress matches your weekly plan</p>
                </div>
              )}
            </div>

            {/* Subjects Section */}
            <div className="mb-8 fade-in-2">
              <div className="flex items-center justify-between mb-6">
                <p className="text-base font-semibold" style={{ color: "var(--text)" }}>📁 Subjects</p>
                <p className="text-sm" style={{ color: "var(--muted)" }}>{coreSubjects.length} courses</p>
              </div>
              <div className="flex flex-col gap-3">
                {coreSubjects.map((subject, si) => {
                  const lectures = subject.modules.flatMap((m) => m.lectures.filter((l) => l.isLecture));
                  const done = lectures.filter((l) => !!completedMap[l.id]).length;
                  const total = lectures.length;
                  const doneHrs = lectures.filter((l) => !!completedMap[l.id]).reduce((s, l) => s + (durationMap[l.id] ?? 0) / 3600, 0);
                  const totalHrs = subjectTotalHours[subject.id] ?? 0;
                  const plannedHrs = subjectPlannedHours[subject.id] ?? 0;
                  const pct = totalHrs > 0 ? Math.round((doneHrs / totalHrs) * 100) : 0;
                  return (
                    <Link key={subject.id} href={`/subject/${subject.id}`}
                      className="glass p-4 hover:scale-[1.01] transition-all duration-200 fade-in"
                      style={{ animationDelay: `${si * 0.04}s` }}>
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold"
                          style={{
                            background: pct === 100 ? "var(--tint-green)" : "var(--tint-accent)",
                            border: `1px solid ${pct === 100 ? "var(--tint-green-border)" : "var(--border)"}`,
                            color: pct === 100 ? "var(--green)" : "var(--accent)",
                          }}>
                          {pct === 100 ? "✓" : si + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base truncate" style={{ color: "var(--text)" }}>{subject.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs px-2 py-1 rounded font-medium" style={{ background: "var(--tint-green)", color: "var(--green)", border: "1px solid var(--tint-green-border)" }}>
                              ✓ {formatHours(doneHrs)}h
                            </span>
                            {plannedHrs > 0 && (
                              <span className="text-xs px-2 py-1 rounded font-medium" style={{ background: "var(--tint-accent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                                📅 {formatHours(plannedHrs)}h
                              </span>
                            )}
                            {totalHrs > 0 && (
                              <span className="text-xs px-2 py-1 rounded font-medium" style={{ background: "var(--tint-accent)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                                {formatHours(totalHrs)}h total
                              </span>
                            )}
                            <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{done}/{total} lectures</span>
                          </div>
                          <div className="mt-2"><ProgressBar value={doneHrs} total={totalHrs} formatValue={formatHours} /></div>
                        </div>
                        <span className="flex-shrink-0 text-xl font-semibold" style={{ color: pct === 100 ? "var(--green)" : "var(--accent)" }}>{pct}%</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Extras Section */}
            {extraSubjects.length > 0 && (
              <div className="fade-in-3">
                <div className="flex items-center justify-between mb-6">
                  <button onClick={() => setExtrasOpen((v) => !v)}
                    className="flex items-center gap-2 text-base font-semibold hover:opacity-80 transition-all"
                    style={{ color: "var(--text)" }}>
                    <span style={{ display: "inline-block", transform: extrasOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>›</span>
                    📦 Extra Resources
                  </button>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>{extraSubjects.length} items</p>
                </div>
                {extrasOpen && (
                  <div className="flex flex-col gap-3">
                    {extraSubjects.map((subject) => {
                      const lectures = subject.modules.flatMap((m) => m.lectures.filter((l) => l.isLecture));
                      const done = lectures.filter((l) => !!completedMap[l.id]).length;
                      const total = lectures.length;
                      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                      return (
                        <Link key={subject.id} href={`/subject/${subject.id}`}
                          className="glass p-4 hover:scale-[1.01] transition-all duration-200">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold"
                              style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--accent)" }}>★</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base truncate" style={{ color: "var(--text)" }}>{subject.name}</p>
                              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{done}/{total} lectures</p>
                              <div className="mt-2"><ProgressBar value={done} total={total} /></div>
                            </div>
                            <span className="flex-shrink-0 text-xl font-semibold" style={{ color: "var(--accent)" }}>{pct}%</span>
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
