"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUser, logout, saveUser } from "@/lib/store";
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
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [targetDate, setTargetDate] = useState<string | undefined>(undefined);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace("/"); return; }
    setUsername(u);
    getUser(u).then((data) => {
      setCompletedMap(data.completedLectures);
      setTargetDate(data.targetDate);
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

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = weeks.flatMap((w) => w.days.filter((d) => d.date === todayStr).flatMap((d) => d.tasks));
  const todayMappedIds = todayTasks.flatMap((t) => t.lectureIds);
  const todayDone = todayMappedIds.filter((id) => !!completedMap[id]).length;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="glow-orb w-96 h-96 -top-32 -right-32" style={{ background: "rgba(99,120,255,0.08)" }} />
      <div className="glow-orb w-64 h-64 bottom-0 -left-32" style={{ background: "rgba(34,211,165,0.05)" }} />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">

        {/* Nav */}
        <div className="flex items-center justify-between mb-8 fade-in">
          <div>
            <h1 className="text-2xl font-bold grad-text">GatePlan</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>Hey, {username} 👋</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link href="/weekly" className="text-xs px-3 py-1.5 rounded-xl" style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--accent2)" }}>📅 Weekly</Link>
            <Link href="/activity" className="text-xs px-3 py-1.5 rounded-xl" style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--accent2)" }}>📊 Activity</Link>
            <Link href="/leaderboard" className="text-xs px-3 py-1.5 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>🏆</Link>
            <ThemeToggle />
            <button onClick={handleSignOut} className="text-xs px-3 py-1.5 rounded-xl hover:opacity-80" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>Sign out</button>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="glass p-5 mb-4 fade-in-1 relative overflow-hidden">
          <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Complete Course</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                {totalDone}/{totalAll} lectures · {formatHours(hoursDone)} / {formatHours(totalCoreHours)}
              </p>
            </div>
            <span className="text-2xl font-bold" style={{ color: "var(--accent2)" }}>{overallPct}%</span>
          </div>
          <ProgressBar value={hoursDone} total={totalCoreHours} formatValue={formatHours} />
        </div>

        {/* ETA + Today row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 fade-in-2">
          <EtaCard
            completedMap={completedMap}
            durationMap={durationMap}
            hoursRemaining={hoursRemaining}
            hoursTotal={totalCoreHours}
            lectureIdSet={coreLectureIdSet}
            weeks={weeks}
            targetDate={targetDate}
            onTargetDateChange={handleTargetDateChange}
          />

          {/* Today's plan */}
          <Link href="/weekly" className="glass p-5 flex flex-col gap-3 hover:scale-[1.01] transition-all relative overflow-hidden">
            <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />
            <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>📋 TODAY&apos;S PLAN</p>
            {todayTasks.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>No tasks scheduled today</p>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  {todayTasks.slice(0, 3).map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--accent)" }} />
                      <p className="text-xs truncate flex-1" style={{ color: "var(--text)" }}>{t.subject} — {t.module}</p>
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--muted)" }}>{t.hours}h</span>
                    </div>
                  ))}
                  {todayTasks.length > 3 && (
                    <p className="text-xs" style={{ color: "var(--muted)" }}>+{todayTasks.length - 3} more</p>
                  )}
                </div>
                {todayMappedIds.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--tint-accent)" }}>
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.round((todayDone / todayMappedIds.length) * 100)}%`, background: "linear-gradient(90deg, var(--accent), var(--accent2))" }} />
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--accent2)" }}>{todayDone}/{todayMappedIds.length}</span>
                  </div>
                )}
              </>
            )}
          </Link>
        </div>

        {/* Complete Course subjects */}
        <div className="mb-4 fade-in-2">
          <p className="text-xs font-semibold mb-3 px-1" style={{ color: "var(--muted)" }}>📁 COMPLETE COURSE</p>
          <div className="flex flex-col gap-2">
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
                  className="glass p-4 hover:scale-[1.005] transition-all duration-200 fade-in"
                  style={{ animationDelay: `${si * 0.04}s` }}>
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{
                        background: pct === 100 ? "rgba(34,211,165,0.15)" : "rgba(99,120,255,0.1)",
                        border: `1px solid ${pct === 100 ? "rgba(34,211,165,0.3)" : "rgba(99,120,255,0.2)"}`,
                        color: pct === 100 ? "var(--green)" : "var(--accent2)",
                      }}>
                      {pct === 100 ? "✓" : si + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{subject.name}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: "rgba(34,211,165,0.1)", color: "var(--green)", border: "1px solid rgba(34,211,165,0.15)" }}>
                          ✓ {formatHours(doneHrs)}
                        </span>
                        {plannedHrs > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: "var(--tint-accent)", color: "var(--accent2)", border: "1px solid var(--border)" }}>
                            📅 {formatHours(plannedHrs)}
                          </span>
                        )}
                        {totalHrs > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: "var(--tint-accent)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                            {formatHours(totalHrs)} total
                          </span>
                        )}
                        <span className="text-xs" style={{ color: "var(--muted)" }}>{done}/{total}</span>
                      </div>
                      <div className="mt-2"><ProgressBar value={doneHrs} total={totalHrs} formatValue={formatHours} /></div>
                    </div>
                    <span className="flex-shrink-0 text-sm font-bold" style={{ color: pct === 100 ? "var(--green)" : "var(--accent2)" }}>{pct}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Extras — collapsible */}
        {extraSubjects.length > 0 && (
          <div className="fade-in-3">
            <button onClick={() => setExtrasOpen((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold mb-3 px-1 hover:opacity-80 transition-all"
              style={{ color: "var(--muted)" }}>
              <span style={{ display: "inline-block", transform: extrasOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>›</span>
              📦 EXTRAS ({extraSubjects.length}) — compact courses &amp; notes, not in ETA
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
                      className="glass p-4 hover:scale-[1.005] transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs"
                          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>★</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{subject.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{done}/{total} lectures</p>
                          <div className="mt-2"><ProgressBar value={done} total={total} /></div>
                        </div>
                        <span className="flex-shrink-0 text-sm font-bold" style={{ color: "#f59e0b" }}>{pct}%</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
