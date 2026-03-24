"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/store";
import { ProgressRing } from "@/components/ProgressBar";
import ThemeToggle from "@/components/ThemeToggle";
import type { Subject } from "@/lib/courseLoader";

interface UserStats {
  username: string;
  totalDone: number;
  totalLectures: number;
  pct: number;
  streak: number;
  todayCount: number;
  weekCount: number;
  subjectProgress: { id: string; name: string; done: number; total: number; pct: number }[];
  recentActivity: { title: string; subjectName: string; timestamp: number }[];
}

const RANK_STYLES = [
  { bg: "linear-gradient(135deg, #f59e0b, #ef4444)", label: "🥇", glow: "rgba(245,158,11,0.3)" },
  { bg: "linear-gradient(135deg, #94a3b8, #cbd5e1)", label: "🥈", glow: "rgba(148,163,184,0.2)" },
  { bg: "linear-gradient(135deg, #cd7c2f, #a16207)", label: "🥉", glow: "rgba(205,124,47,0.2)" },
];

const USER_COLORS = [
  ["#6378ff", "#a78bfa"],
  ["#22d3a5", "#06b6d4"],
  ["#f59e0b", "#ef4444"],
  ["#ec4899", "#a78bfa"],
  ["#84cc16", "#22d3a5"],
];

function calcStreak(completedMap: Record<string, number | false>): number {
  const days = new Set(
    Object.values(completedMap)
      .filter(Boolean)
      .map((ts) => new Date(ts as number).toDateString())
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function LeaderboardClient({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const [me, setMe] = useState<string>("");
  const [users, setUsers] = useState<UserStats[]>([]);
  const [tab, setTab] = useState<"overall" | "today" | "week">("overall");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Build lecture lookup
  const lectureMap = new Map<string, { title: string; subjectName: string; subjectId: string }>();
  for (const s of subjects) {
    for (const m of s.modules) {
      for (const l of m.lectures) {
        lectureMap.set(l.id, { title: l.title, subjectName: s.name, subjectId: s.id });
      }
    }
  }
  const totalLectures = subjects.reduce((s, sub) => s + sub.modules.reduce((ms, m) => ms + m.lectures.length, 0), 0);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) { router.replace("/"); return; }
    setMe(current);

    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;

    setIsLoading(true);
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((allUsers: { username: string; completedLectures: Record<string, number | false> }[]) => {
        const stats: UserStats[] = allUsers.map(({ username, completedLectures: cm }) => {
          const doneIds = Object.entries(cm).filter(([, v]) => !!v);
          const totalDone = doneIds.length;
          const pct = totalLectures === 0 ? 0 : Math.round((totalDone / totalLectures) * 100);
          const streak = calcStreak(cm);
          const todayCount = doneIds.filter(([, v]) => (v as number) >= todayStart).length;
          const weekCount = doneIds.filter(([, v]) => (v as number) >= weekStart).length;

          const subjectProgress = subjects.map((s) => {
            const total = s.modules.reduce((acc, m) => acc + m.lectures.length, 0);
            const done = s.modules.reduce(
              (acc, m) => acc + m.lectures.filter((l) => !!cm[l.id]).length, 0
            );
            return { id: s.id, name: s.name, done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
          }).filter((s) => s.total > 0);

          const recentActivity = doneIds
            .map(([id, ts]) => {
              const meta = lectureMap.get(id);
              return meta ? { title: meta.title, subjectName: meta.subjectName, timestamp: ts as number } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b!.timestamp - a!.timestamp)
            .slice(0, 5) as { title: string; subjectName: string; timestamp: number }[];

          return { username, totalDone, totalLectures, pct, streak, todayCount, weekCount, subjectProgress, recentActivity };
        });

        stats.sort((a, b) => b.totalDone - a.totalDone);
        setUsers(stats);
      })
      .catch((error) => {
        console.error("Failed to fetch leaderboard:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const sorted = [...users].sort((a, b) => {
    if (tab === "today") return b.todayCount - a.todayCount;
    if (tab === "week") return b.weekCount - a.weekCount;
    return b.totalDone - a.totalDone;
  });

  const topUser = sorted[0];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="glow-orb w-[500px] h-[500px] -top-48 -right-48" style={{ background: "rgba(99,120,255,0.07)" }} />
      <div className="glow-orb w-64 h-64 bottom-0 -left-16" style={{ background: "rgba(34,211,165,0.05)" }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 fade-in">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm hover:opacity-80 transition-all" style={{ color: "var(--muted)" }}>
              ← Dashboard
            </Link>
            <div className="w-px h-4 hidden sm:block" style={{ background: "var(--border)" }} />
            <h1 className="text-lg font-bold">
              <span className="grad-text">Leaderboard</span> 🏆
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/weekly" className="text-xs px-3 py-1.5 rounded-xl transition-all"
              style={{ background: "var(--tint-accent)", border: "1px solid var(--border)", color: "var(--accent2)" }}>
              📅 Weekly
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="glass p-6 mb-6 fade-in-1">
            <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />
            <p className="text-xs font-semibold mb-5 text-center" style={{ color: "var(--muted)" }}>
              LOADING LEADERBOARD...
            </p>
            {/* Loading skeletons */}
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-gray-300 pulse-dot" />
                  </div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-300 rounded w-24 mb-2 pulse-dot" />
                    <div className="h-3 bg-gray-300 rounded w-16 mb-1 pulse-dot" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {sorted.length >= 2 && (
              <div className="glass p-4 sm:p-6 mb-6 fade-in-1 relative overflow-hidden">
                <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />
                <p className="text-xs font-semibold mb-5 text-center" style={{ color: "var(--muted)" }}>
                  OVERALL STANDINGS
                </p>
                <div className="flex items-end justify-center gap-2 sm:gap-4">
                  {/* 2nd place */}
                  {sorted[1] && (
                    <PodiumCard user={sorted[1]} rank={2} isMe={sorted[1].username === me} tab={tab} />
                  )}
                  {/* 1st place — taller */}
                  {sorted[0] && (
                    <PodiumCard user={sorted[0]} rank={1} isMe={sorted[0].username === me} tab={tab} tall />
                  )}
                  {/* 3rd place */}
                  {sorted[2] && (
                    <PodiumCard user={sorted[2]} rank={3} isMe={sorted[2].username === me} tab={tab} />
                  )}
                </div>
              </div>
            )}

            {/* Tab selector */}
            <div className="flex flex-wrap justify-center gap-2 mb-5 fade-in-2">
              {(["overall", "today", "week"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="text-xs px-3 sm:px-4 py-2 rounded-xl transition-all capitalize"
                  style={{
                    background: tab === t ? "linear-gradient(135deg, var(--accent), #8b5cf6)" : "var(--tint-accent)",
                    border: `1px solid ${tab === t ? "transparent" : "var(--border)"}`,
                    color: tab === t ? "white" : "var(--muted)",
                    fontWeight: tab === t ? 600 : 400,
                  }}>
                  {t === "overall" ? "All Time" : t === "today" ? "Today" : "This Week"}
                </button>
              ))}
            </div>

            {/* Full rankings list */}
            <div className="flex flex-col gap-3 fade-in-3">
              {sorted.map((user, i) => {
                const [c1, c2] = USER_COLORS[i % USER_COLORS.length];
                const rankStyle = RANK_STYLES[i] ?? null;
                const isMe = user.username === me;
                const score = tab === "today" ? user.todayCount : tab === "week" ? user.weekCount : user.totalDone;
                const scoreLabel = tab === "today" ? "today" : tab === "week" ? "this week" : "total";

                return (
                  <div key={user.username}>
                    <div
                      className="glass p-3 sm:p-4 flex items-center gap-3 sm:gap-4 cursor-pointer hover:scale-[1.005] transition-all"
                      style={{
                        border: isMe ? `1px solid ${c1}60` : "1px solid var(--border)",
                        boxShadow: isMe ? `0 0 20px ${c1}20` : "none",
                      }}
                      onClick={() => setExpanded(expanded === user.username ? null : user.username)}
                    >
                      {/* Rank */}
                      <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm"
                        style={{
                          background: rankStyle ? rankStyle.bg : "var(--tint-accent)",
                          boxShadow: rankStyle ? `0 0 12px ${rankStyle.glow}` : "none",
                          color: rankStyle ? "white" : "var(--muted)",
                        }}>
                        {rankStyle ? rankStyle.label : `#${i + 1}`}
                      </div>

                      {/* Avatar + name */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                          {user.username[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>
                              {user.username}
                            </p>
                            {isMe && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: `${c1}22`, color: c1, border: `1px solid ${c1}44` }}>
                                you
                              </span>
                            )}
                            {i === 0 && tab === "overall" && (
                              <span className="text-xs flex-shrink-0" style={{ color: "#f59e0b" }}> Leading</span>
                            )}
                          </div>
                          <p className="text-xs hidden sm:block" style={{ color: "var(--muted)" }}>
                             {user.streak} day streak · {user.pct}% overall
                          </p>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-lg font-bold" style={{ color: c1 }}>{score}</p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>{scoreLabel}</p>
                      </div>

                      {/* Progress ring */}
                      <div className="flex-shrink-0 relative">
                        <ProgressRing value={user.totalDone} total={user.totalLectures} radius={22} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold" style={{ color: "var(--text)", fontSize: "9px" }}>
                            {user.pct}%
                          </span>
                        </div>
                      </div>

                      {/* Expand chevron */}
                      <div className="flex-shrink-0 text-sm transition-transform" style={{
                        color: "var(--muted)",
                        transform: expanded === user.username ? "rotate(90deg)" : "rotate(0deg)",
                      }}>›</div>
                    </div>

                    {/* Expanded detail */}
                    {expanded === user.username && (
                      <div className="mt-1 mb-2 rounded-2xl p-4 flex flex-col gap-4"
                        style={{ background: "var(--tint-accent)", border: "1px solid var(--border)" }}>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Today", val: user.todayCount, color: "var(--green)" },
                            { label: "This week", val: user.weekCount, color: "var(--accent2)" },
                            { label: "Streak 🔥", val: user.streak, color: "#f59e0b" },
                          ].map((s) => (
                            <div key={s.label} className="rounded-xl p-3 text-center"
                              style={{ background: "var(--glass-bg)", border: "1px solid var(--border)" }}>
                              <p className="text-base font-bold" style={{ color: s.color }}>{s.val}</p>
                              <p className="text-xs" style={{ color: "var(--muted)" }}>{s.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Subject breakdown */}
                        <div>
                          <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>SUBJECT PROGRESS</p>
                          <div className="flex flex-col gap-2">
                            {user.subjectProgress.map((sp) => (
                              <div key={sp.id} className="flex items-center gap-3">
                                <p className="text-xs truncate flex-1" style={{ color: "var(--text)" }}>{sp.name}</p>
                                <div className="w-24 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--border)" }}>
                                  <div className="h-1.5 rounded-full transition-all"
                                    style={{
                                      width: `${sp.pct}%`,
                                      background: sp.pct === 100
                                        ? "linear-gradient(90deg, var(--green), var(--accent))"
                                        : "linear-gradient(90deg, var(--accent), var(--accent2))",
                                    }} />
                                </div>
                                <span className="text-xs w-8 text-right flex-shrink-0"
                                  style={{ color: sp.pct === 100 ? "var(--green)" : "var(--muted)" }}>
                                  {sp.pct}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Recent activity */}
                        {user.recentActivity.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>RECENT ACTIVITY</p>
                            <div className="flex flex-col gap-1.5">
                              {user.recentActivity.map((a, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--accent)" }} />
                                  <p className="text-xs flex-1 truncate" style={{ color: "var(--text)" }}>{a.title}</p>
                                  <span className="text-xs flex-shrink-0" style={{ color: "var(--muted)" }}>
                                    {timeAgo(a.timestamp)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Empty state */}
            {users.length === 0 && !isLoading && (
              <div className="glass p-12 text-center fade-in-3">
                <p className="text-3xl mb-3">👥</p>
                <p className="font-semibold" style={{ color: "var(--text)" }}>No users yet</p>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Share app with friends to see leaderboard</p>
              </div>
            )}
          </>
        )}

        {/* Motivational footer */}
        {topUser && topUser.username !== me && (
          <div className="mt-6 glass p-4 text-center fade-in-4"
            style={{ border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)" }}>
            <p className="text-sm font-semibold" style={{ color: "#f59e0b" }}>
              {topUser.username} is leading with {topUser.totalDone} lectures — keep pushing!
            </p>
          </div>
        )}
        {topUser && topUser.username === me && (
          <div className="mt-6 glass p-4 text-center fade-in-4"
            style={{ border: "1px solid rgba(34,211,165,0.2)", background: "rgba(34,211,165,0.04)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>
              👑 You&apos;re leading the pack — don&apos;t slow down!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumCard({
  user, rank, isMe, tab, tall = false,
}: {
  user: UserStats; rank: number; isMe: boolean; tab: "overall" | "today" | "week"; tall?: boolean;
}) {
  const [c1, c2] = USER_COLORS[(rank - 1) % USER_COLORS.length];
  const score = tab === "today" ? user.todayCount : tab === "week" ? user.weekCount : user.totalDone;
  const medal = ["🥇", "🥈", "🥉"][rank - 1];

  return (
    <div className={`flex flex-col items-center gap-2 ${tall ? "mb-0" : "mb-0 mt-6"}`}
      style={{ minWidth: "80px" }}>
      <span className="text-2xl">{medal}</span>
      <div className={`rounded-full flex items-center justify-center font-bold ${tall ? "w-14 h-14 text-lg" : "w-11 h-11 text-sm"}`}
        style={{
          background: `linear-gradient(135deg, ${c1}, ${c2})`,
          boxShadow: `0 0 20px ${c1}50`,
          border: isMe ? `2px solid white` : "none",
        }}>
        {user.username[0].toUpperCase()}
      </div>
      <p className="text-xs font-semibold text-center" style={{ color: "var(--text)" }}>
        {user.username}{isMe ? " 👈" : ""}
      </p>
      <p className="text-sm font-bold" style={{ color: c1 }}>{score}</p>
      <p className="text-xs" style={{ color: "var(--muted)" }}>🔥 {user.streak}</p>
    </div>
  );
}
