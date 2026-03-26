"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/store";
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

const USER_COLORS = [
  "#6378ff", "#22d3a5", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#a78bfa",
];

const MEDALS = ["🥇", "🥈", "🥉"];

function calcStreak(cm: Record<string, number | false>): number {
  const days = new Set(
    Object.values(cm).filter(Boolean).map((ts) => new Date(ts as number).toDateString())
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
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
      {name[0].toUpperCase()}
    </div>
  );
}

export default function LeaderboardClient({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const [me, setMe] = useState("");
  const [users, setUsers] = useState<UserStats[]>([]);
  const [tab, setTab] = useState<"overall" | "today" | "week">("overall");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const lectureMap = new Map<string, { title: string; subjectName: string }>();
  for (const s of subjects) {
    for (const m of s.modules) {
      for (const l of m.lectures) {
        lectureMap.set(l.id, { title: l.title, subjectName: s.name });
      }
    }
  }
  const totalLectures = subjects.reduce(
    (s, sub) => s + sub.modules.reduce((ms, m) => ms + m.lectures.length, 0), 0
  );

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) { router.replace("/"); return; }
    setMe(current);
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const weekStart = Date.now() - 7 * 86400000;

    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((all: { username: string; completedLectures: Record<string, number | false> }[]) => {
        const stats: UserStats[] = all.map(({ username, completedLectures: cm }) => {
          const doneIds = Object.entries(cm).filter(([, v]) => !!v);
          const totalDone = doneIds.length;
          const pct = totalLectures === 0 ? 0 : Math.round((totalDone / totalLectures) * 100);
          const streak = calcStreak(cm);
          const todayCount = doneIds.filter(([, v]) => (v as number) >= todayStart).length;
          const weekCount = doneIds.filter(([, v]) => (v as number) >= weekStart).length;
          const subjectProgress = subjects.map((s) => {
            const total = s.modules.reduce((a, m) => a + m.lectures.length, 0);
            const done = s.modules.reduce((a, m) => a + m.lectures.filter((l) => !!cm[l.id]).length, 0);
            return { id: s.id, name: s.name, done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
          }).filter((s) => s.total > 0);
          const recentActivity = doneIds
            .map(([id, ts]) => { const meta = lectureMap.get(id); return meta ? { ...meta, timestamp: ts as number } : null; })
            .filter(Boolean).sort((a, b) => b!.timestamp - a!.timestamp).slice(0, 5) as { title: string; subjectName: string; timestamp: number }[];
          return { username, totalDone, totalLectures, pct, streak, todayCount, weekCount, subjectProgress, recentActivity };
        });
        stats.sort((a, b) => b.totalDone - a.totalDone);
        setUsers(stats);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const sorted = [...users].sort((a, b) => {
    if (tab === "today") return b.todayCount - a.todayCount;
    if (tab === "week") return b.weekCount - a.weekCount;
    return b.totalDone - a.totalDone;
  });

  const getScore = (u: UserStats) =>
    tab === "today" ? u.todayCount : tab === "week" ? u.weekCount : u.totalDone;

  const myStats = users.find((u) => u.username === me);
  const myRank = sorted.findIndex((u) => u.username === me) + 1;
  const leader = sorted[0];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="mb-6 fade-in">
          <h1 className="text-base font-bold">
            <span className="grad-text">Leaderboard</span>
            <span style={{ color: "var(--text)" }}> 🏆</span>
          </h1>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl fade-in-1"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          {(["overall", "today", "week"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 text-xs py-2 rounded-lg font-semibold transition-all"
              style={{
                background: tab === t ? "var(--accent)" : "transparent",
                color: tab === t ? "white" : "var(--muted)",
              }}>
              {t === "overall" ? "All Time" : t === "today" ? "Today" : "This Week"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: "var(--surface2)" }} />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 rounded animate-pulse" style={{ background: "var(--surface2)", width: "40%" }} />
                  <div className="h-2 rounded animate-pulse" style={{ background: "var(--surface2)", width: "60%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="glass p-12 text-center">
            <p className="text-3xl mb-3">👥</p>
            <p className="font-semibold" style={{ color: "var(--text)" }}>No users yet</p>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Share with friends to see rankings</p>
          </div>
        ) : (
          <>
            {/* ── Podium (top 3) ── */}
            {sorted.length >= 2 && (
              <div className="glass p-5 mb-5 fade-in-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-center mb-5"
                  style={{ color: "var(--muted)" }}>
                  {tab === "overall" ? "All-time standings" : tab === "today" ? "Today's standings" : "This week's standings"}
                </p>
                <div className="flex items-end justify-center gap-4">
                  {/* 2nd */}
                  {sorted[1] && <PodiumCard user={sorted[1]} rank={2} isMe={sorted[1].username === me} score={getScore(sorted[1])} color={USER_COLORS[1]} />}
                  {/* 1st */}
                  <PodiumCard user={sorted[0]} rank={1} isMe={sorted[0].username === me} score={getScore(sorted[0])} color={USER_COLORS[0]} tall />
                  {/* 3rd */}
                  {sorted[2] && <PodiumCard user={sorted[2]} rank={3} isMe={sorted[2].username === me} score={getScore(sorted[2])} color={USER_COLORS[2]} />}
                </div>
              </div>
            )}

            {/* ── My position banner (if not in top 3) ── */}
            {myStats && myRank > 3 && (
              <div className="glass p-4 mb-5 fade-in-2"
                style={{ border: `1px solid ${USER_COLORS[(myRank - 1) % USER_COLORS.length]}40` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-1 rounded-lg"
                      style={{ background: "var(--tint-accent)", color: "var(--accent)" }}>
                      #{myRank}
                    </span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Your position</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {getScore(leader) - getScore(myStats)} {tab === "overall" ? "lectures" : tab === "today" ? "lectures today" : "lectures this week"} behind {leader.username}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: USER_COLORS[(myRank - 1) % USER_COLORS.length] }}>
                      {getScore(myStats)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>{myStats.pct}% overall</p>
                  </div>
                </div>
                {/* Gap bar */}
                {tab === "overall" && getScore(leader) > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 rounded-full" style={{ background: "var(--surface2)" }}>
                      <div className="h-1.5 rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.round((getScore(myStats) / getScore(leader)) * 100)}%`,
                          background: `linear-gradient(90deg, var(--accent), var(--accent2))`,
                        }} />
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                      {Math.round((getScore(myStats) / getScore(leader)) * 100)}% of leader's count
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Full rankings ── */}
            <div className="flex flex-col gap-2 fade-in-3">
              {sorted.map((user, i) => {
                const color = USER_COLORS[i % USER_COLORS.length];
                const isMe = user.username === me;
                const score = getScore(user);
                const isOpen = expanded === user.username;
                const leaderScore = getScore(sorted[0]);

                return (
                  <div key={user.username}>
                    <div
                      className="glass transition-all cursor-pointer hover:scale-[1.003]"
                      style={{ border: `1px solid ${isMe ? color + "60" : "var(--border)"}` }}
                      onClick={() => setExpanded(isOpen ? null : user.username)}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-7 text-center">
                          {i < 3 ? (
                            <span className="text-base">{MEDALS[i]}</span>
                          ) : (
                            <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>#{i + 1}</span>
                          )}
                        </div>

                        {/* Avatar */}
                        <Avatar name={user.username} color={color} size={34} />

                        {/* Name + meta */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                              {user.username}
                            </p>
                            {isMe && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                                you
                              </span>
                            )}
                          </div>
                          {/* Progress bar vs leader */}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 rounded-full" style={{ background: "var(--surface2)" }}>
                              <div className="h-1 rounded-full transition-all duration-500"
                                style={{
                                  width: leaderScore > 0 ? `${Math.round((score / leaderScore) * 100)}%` : "0%",
                                  background: color,
                                }} />
                            </div>
                            <span className="text-xs flex-shrink-0" style={{ color: "var(--muted)" }}>
                              🔥 {user.streak}
                            </span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="flex-shrink-0 text-right">
                          <p className="text-base font-bold" style={{ color }}>{score}</p>
                          <p className="text-xs" style={{ color: "var(--muted)" }}>{user.pct}%</p>
                        </div>

                        {/* Chevron */}
                        <svg className="flex-shrink-0 transition-transform duration-200"
                          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", color: "var(--muted)" }}
                          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>

                    {/* ── Expanded detail ── */}
                    {isOpen && (
                      <div className="rounded-b-xl px-4 py-4 flex flex-col gap-4"
                        style={{ background: "var(--surface2)", border: `1px solid ${color}30`, borderTop: "none" }}>

                        {/* Quick stats */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Today", val: user.todayCount, color: "var(--green)" },
                            { label: "This week", val: user.weekCount, color: "var(--accent2)" },
                            { label: "Streak", val: `${user.streak} 🔥`, color: "#f59e0b" },
                          ].map((s) => (
                            <div key={s.label} className="rounded-xl p-3 text-center"
                              style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
                              <p className="text-base font-bold" style={{ color: s.color }}>{s.val}</p>
                              <p className="text-xs" style={{ color: "var(--muted)" }}>{s.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Subject progress */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
                            Subject progress
                          </p>
                          <div className="flex flex-col gap-2">
                            {user.subjectProgress.slice(0, 6).map((sp) => (
                              <div key={sp.id} className="flex items-center gap-3">
                                <p className="text-xs truncate flex-1" style={{ color: "var(--text)" }}>{sp.name}</p>
                                <div className="w-28 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--border)" }}>
                                  <div className="h-1.5 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${sp.pct}%`,
                                      background: sp.pct === 100
                                        ? "linear-gradient(90deg, var(--green), var(--accent))"
                                        : `linear-gradient(90deg, ${color}, ${color}99)`,
                                    }} />
                                </div>
                                <span className="text-xs w-8 text-right flex-shrink-0 font-medium"
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
                            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
                              Recent activity
                            </p>
                            <div className="flex flex-col gap-1.5">
                              {user.recentActivity.map((a, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
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

            {/* ── Motivational footer ── */}
            <div className="mt-5 glass p-4 text-center fade-in-4"
              style={{
                border: leader?.username === me
                  ? "1px solid rgba(34,211,165,0.25)"
                  : "1px solid rgba(245,158,11,0.2)",
                background: leader?.username === me
                  ? "rgba(34,211,165,0.04)"
                  : "rgba(245,158,11,0.04)",
              }}>
              {leader?.username === me ? (
                <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>
                  👑 You're leading — keep the momentum going
                </p>
              ) : leader ? (
                <p className="text-sm font-semibold" style={{ color: "#f59e0b" }}>
                  {leader.username} is ahead by {getScore(leader) - (myStats ? getScore(myStats) : 0)} lectures — close the gap
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PodiumCard({ user, rank, isMe, score, color, tall = false }: {
  user: UserStats; rank: number; isMe: boolean; score: number; color: string; tall?: boolean;
}) {
  const size = tall ? 52 : 40;
  return (
    <div className={`flex flex-col items-center gap-1.5 ${tall ? "" : "mt-5"}`} style={{ minWidth: "80px" }}>
      <span className="text-xl">{MEDALS[rank - 1]}</span>
      <div className="rounded-full flex items-center justify-center font-bold text-white"
        style={{
          width: size, height: size,
          background: color,
          boxShadow: `0 0 ${tall ? 20 : 12}px ${color}60`,
          border: isMe ? "2px solid white" : "none",
          fontSize: size * 0.38,
        }}>
        {user.username[0].toUpperCase()}
      </div>
      <p className="text-xs font-semibold text-center truncate" style={{ color: "var(--text)", maxWidth: "80px" }}>
        {user.username}{isMe ? " 👈" : ""}
      </p>
      <p className="text-sm font-bold" style={{ color }}>{score}</p>
      <p className="text-xs" style={{ color: "var(--muted)" }}>🔥 {user.streak}</p>
      {/* Podium base */}
      <div className="w-full rounded-t-md mt-1"
        style={{
          height: tall ? "32px" : "20px",
          background: `${color}25`,
          border: `1px solid ${color}40`,
        }} />
    </div>
  );
}
