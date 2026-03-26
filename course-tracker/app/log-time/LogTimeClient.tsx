"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logStudySession } from "@/lib/store";
import type { Subject } from "@/lib/courseLoader";

// ── Dial ─────────────────────────────────────────────────────────────────────

function TimeDial({ minutes, onChange }: { minutes: number; onChange: (m: number) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const MAX = 300;

  function getMinutes(e: React.MouseEvent | React.TouchEvent) {
    const svg = svgRef.current;
    if (!svg) return minutes;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    let angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return Math.max(1, Math.round((angle / 360) * MAX));
  }

  const angle = (minutes / MAX) * 360;
  const r = 90; const cx = 110; const cy = 110;
  const endRad = ((angle - 90) * Math.PI) / 180;
  const arcX = cx + r * Math.cos(endRad);
  const arcY = cy + r * Math.sin(endRad);
  const arcPath = `M ${cx} ${cy - r} A ${r} ${r} 0 ${angle > 180 ? 1 : 0} 1 ${arcX} ${arcY}`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg ref={svgRef} width="220" height="220" viewBox="0 0 220 220"
        className="cursor-pointer select-none touch-none"
        onMouseMove={(e) => e.buttons === 1 && onChange(getMinutes(e))}
        onMouseDown={(e) => onChange(getMinutes(e))}
        onTouchMove={(e) => { e.preventDefault(); onChange(getMinutes(e)); }}
        onTouchStart={(e) => onChange(getMinutes(e))}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(99,120,255,0.12)" strokeWidth="18" />
        {minutes > 0 && <path d={arcPath} fill="none" stroke="url(#dg)" strokeWidth="18" strokeLinecap="round" />}
        <defs>
          <linearGradient id="dg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6378ff" /><stop offset="100%" stopColor="#22d3a5" />
          </linearGradient>
        </defs>
        <circle cx={arcX} cy={arcY} r="12" fill="#6378ff" stroke="white" strokeWidth="3"
          style={{ filter: "drop-shadow(0 0 8px rgba(99,120,255,0.8))" }} />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="26" fontWeight="bold" fill="var(--text)">
          {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="var(--muted)">drag to set time</text>
      </svg>
      <div className="flex gap-2 flex-wrap justify-center">
        {[15, 30, 45, 60, 90, 120, 180].map((m) => (
          <button key={m} onClick={() => onChange(m)}
            className="text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
            style={{
              background: minutes === m ? "linear-gradient(135deg,#6378ff,#22d3a5)" : "rgba(99,120,255,0.1)",
              color: minutes === m ? "white" : "var(--muted)",
              border: `1px solid ${minutes === m ? "transparent" : "rgba(99,120,255,0.2)"}`,
            }}>
            {m >= 60 ? `${m / 60}h` : `${m}m`}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type TimerMode = "idle" | "running" | "paused";

export default function LogTimeClient({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [note, setNote] = useState("");
  const [inputMode, setInputMode] = useState<"timer" | "manual">("timer");
  const [timerMode, setTimerMode] = useState<TimerMode>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(30);
  const [saving, setSaving] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // localStorage keys
  const LS_START = "gateplan_timer_start";   // ms timestamp when timer started
  const LS_PAUSE = "gateplan_timer_pause";   // ms of elapsed when paused

  // On mount: restore timer state from localStorage
  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace("/"); return; }

    const storedStart = localStorage.getItem(LS_START);
    const storedPause = localStorage.getItem(LS_PAUSE);

    if (storedStart) {
      // Was running — resume from wall-clock
      const startMs = parseInt(storedStart, 10);
      const currentElapsed = Math.floor((Date.now() - startMs) / 1000);
      setElapsed(currentElapsed);
      setTimerMode("running");
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startMs) / 1000));
      }, 500);
    } else if (storedPause) {
      // Was paused — restore elapsed
      setElapsed(parseInt(storedPause, 10));
      setTimerMode("paused");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const selectedSubject = subjects.find((s) => s.id === subjectId) ?? null;
  const modules = selectedSubject?.modules ?? [];
  const selectedModule = modules.find((m) => m.id === moduleId) ?? null;

  function startTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    // Store start as (now - already elapsed ms) so elapsed stays continuous
    const startMs = Date.now() - elapsed * 1000;
    localStorage.setItem(LS_START, String(startMs));
    localStorage.removeItem(LS_PAUSE);
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startMs) / 1000));
    }, 500);
    setTimerMode("running");
  }

  function pauseTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    localStorage.removeItem(LS_START);
    localStorage.setItem(LS_PAUSE, String(elapsed));
    setTimerMode("paused");
  }

  function resetTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    localStorage.removeItem(LS_START);
    localStorage.removeItem(LS_PAUSE);
    setElapsed(0);
    setTimerMode("idle");
  }

  function fmt(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  const durationMinutes = inputMode === "manual"
    ? manualMinutes
    : Math.max(1, Math.round(elapsed / 60));

  const canLog = !!selectedSubject && (
    inputMode === "manual" ? manualMinutes >= 1 : elapsed > 0
  );

  async function handleLog() {
    const u = getCurrentUser();
    console.log("handleLog called - current user:", u);
    console.log("selectedSubject:", selectedSubject);
    console.log("durationMinutes:", durationMinutes);
    
    if (!u || !selectedSubject) {
      console.error("Missing user or subject", { u, selectedSubject });
      return;
    }
    setSaving(true);
    try {
      const sessionData = {
        startedAt: Date.now(),
        durationMinutes: Math.max(1, durationMinutes),
        subjectName: selectedSubject.name,
        moduleName: selectedModule?.name,
        note: note.trim() || undefined,
      };
      console.log("Logging session:", sessionData);
      
      const result = await logStudySession(u, sessionData);
      console.log("Session logged successfully:", result);
      
      localStorage.removeItem("gateplan_timer_start");
      localStorage.removeItem("gateplan_timer_pause");
      router.push("/activity?tab=sessions");
    } catch (err) {
      console.error("Failed to log session:", err);
      alert("Failed to save session. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const selectStyle = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "14px",
    width: "100%",
    outline: "none",
    appearance: "none" as const,
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="glow-orb w-96 h-96 -top-32 -right-32" style={{ background: "rgba(99,120,255,0.08)" }} />
      <div className="glow-orb w-64 h-64 bottom-0 -left-32" style={{ background: "rgba(34,211,165,0.05)" }} />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">

        {/* Nav */}
        <div className="mb-6 fade-in">
          <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Log Study Time</h1>
        </div>

        <div className="glass p-6 fade-in-1 relative overflow-hidden flex flex-col gap-5">
          <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />

          {/* Subject dropdown */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--muted)" }}>SUBJECT</label>
            <div className="relative">
              <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setModuleId(""); }}
                style={selectStyle}>
                <option value="">— select subject —</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs" style={{ color: "var(--muted)" }}>▾</span>
            </div>
          </div>

          {/* Module dropdown */}
          {selectedSubject && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--muted)" }}>MODULE <span className="font-normal">(optional)</span></label>
              <div className="relative">
                <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} style={selectStyle}>
                  <option value="">— select module —</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs" style={{ color: "var(--muted)" }}>▾</span>
              </div>
            </div>
          )}

          {/* Mode toggle */}
          <div style={{ opacity: selectedSubject ? 1 : 0.4, pointerEvents: selectedSubject ? "auto" : "none", transition: "opacity 0.2s" }}>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--muted)" }}>TIME SPENT</label>
            <div className="flex gap-2 p-1 rounded-xl mb-4" style={{ background: "rgba(99,120,255,0.08)", border: "1px solid rgba(99,120,255,0.12)" }}>
              {(["timer", "manual"] as const).map((m) => (
                <button key={m} onClick={() => { resetTimer(); setInputMode(m); }}
                  className="flex-1 text-sm py-1.5 rounded-lg font-semibold transition-all"
                  style={{
                    background: inputMode === m ? "linear-gradient(135deg,#6378ff,#8b5cf6)" : "transparent",
                    color: inputMode === m ? "white" : "var(--muted)",
                  }}>
                  {m === "timer" ? "🕐 Live Timer" : "✏️ Manual"}
                </button>
              ))}
            </div>

            {/* Timer */}
            {inputMode === "timer" && (
              <div className="flex flex-col items-center gap-4">
                <div className="text-6xl font-mono font-bold tabular-nums"
                  style={{ color: timerMode === "running" ? "var(--green)" : timerMode === "paused" ? "#f59e0b" : "var(--text)", letterSpacing: "-3px" }}>
                  {fmt(elapsed)}
                </div>
                <div className="flex gap-2">
                  {/* Start — only when idle */}
                  {timerMode === "idle" && (
                    <button onClick={startTimer}
                      className="px-8 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg,#22d3a5,#6378ff)", color: "white" }}>
                      ▶ Start
                    </button>
                  )}

                  {/* Pause — only when running */}
                  {timerMode === "running" && (
                    <button onClick={pauseTimer}
                      className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                      style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                      ⏸ Pause
                    </button>
                  )}

                  {/* Resume — only when paused */}
                  {timerMode === "paused" && (
                    <button onClick={startTimer}
                      className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg,#22d3a5,#6378ff)", color: "white" }}>
                      ▶ Resume
                    </button>
                  )}

                  {/* Stop — running or paused, logs the time */}
                  {timerMode !== "idle" && elapsed > 0 && (
                    <button onClick={handleLog}
                      className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg,#6378ff,#8b5cf6)", color: "white" }}>
                      ⏹ Stop & Log
                    </button>
                  )}

                  {/* Reset — running or paused, asks confirmation */}
                  {timerMode !== "idle" && (
                    <button
                      onClick={() => {
                        if (confirm("Reset the timer? This will discard the current session.")) resetTimer();
                      }}
                      className="px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                      ↺ Reset
                    </button>
                  )}
                </div>
                {!selectedSubject && timerMode === "idle" && (
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Select a subject above to enable the timer</p>
                )}
                {selectedSubject && timerMode === "idle" && (
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Switch to Manual if timer doesn&apos;t work</p>
                )}
                {timerMode !== "idle" && elapsed === 0 && (
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Timer running…</p>
                )}
              </div>
            )}

            {/* Dial */}
            {inputMode === "manual" && (
              <TimeDial minutes={manualMinutes} onChange={setManualMinutes} />
            )}
          </div>

          {/* Note */}
          <div style={{ opacity: selectedSubject ? 1 : 0.4, pointerEvents: selectedSubject ? "auto" : "none", transition: "opacity 0.2s" }}>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--muted)" }}>NOTE <span className="font-normal">(optional)</span></label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Finished process scheduling chapter"
              className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>

          {/* Log button — always shown in manual, shown in timer mode once timer has started */}
          {(inputMode === "manual" || elapsed > 0) && (
          <button onClick={handleLog} disabled={!canLog || saving}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all"
            style={{
              background: canLog ? "linear-gradient(135deg,#6378ff,#22d3a5)" : "rgba(99,120,255,0.12)",
              color: canLog ? "white" : "var(--muted)",
              opacity: saving ? 0.7 : 1,
              boxShadow: canLog ? "0 4px 20px rgba(99,120,255,0.3)" : "none",
              cursor: canLog ? "pointer" : "not-allowed",
            }}>
            {saving
              ? "Saving…"
              : !selectedSubject
                ? "Select a subject to continue"
                : canLog
                  ? `✓ Log ${durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m` : `${durationMinutes}m`} · ${selectedSubject.name}${selectedModule ? ` › ${selectedModule.name}` : ""}`
                  : inputMode === "timer" ? "Start the timer first" : "Set a duration"}
          </button>
          )}
        </div>
      </div>
    </div>
  );
}
