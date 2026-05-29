"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logStudySession } from "@/lib/store";
import type { Subject } from "@/lib/courseLoader";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Plus,
  Trash2,
  CheckCircle2,
  Headphones,
  Target,
  Clock,
  ChevronLeft,
  Settings,
  Sparkles,
  BookOpen
} from "lucide-react";

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
  const r = 90;
  const cx = 110;
  const cy = 110;
  const endRad = ((angle - 90) * Math.PI) / 180;
  const arcX = cx + r * Math.cos(endRad);
  const arcY = cy + r * Math.sin(endRad);
  const arcPath = `M ${cx} ${cy - r} A ${r} ${r} 0 ${angle > 180 ? 1 : 0} 1 ${arcX} ${arcY}`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg
          ref={svgRef}
          width="220"
          height="220"
          viewBox="0 0 220 220"
          className="cursor-pointer select-none touch-none filter drop-shadow-[0_0_15px_rgba(99,120,255,0.08)]"
          onMouseMove={(e) => e.buttons === 1 && onChange(getMinutes(e))}
          onMouseDown={(e) => onChange(getMinutes(e))}
          onTouchMove={(e) => {
            e.preventDefault();
            onChange(getMinutes(e));
          }}
          onTouchStart={(e) => onChange(getMinutes(e))}
        >
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="16" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(99,120,255,0.05)" strokeWidth="16" />
          {minutes > 0 && <path d={arcPath} fill="none" stroke="url(#dg)" strokeWidth="16" strokeLinecap="round" />}
          <defs>
            <linearGradient id="dg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent2)" />
            </linearGradient>
          </defs>
          <circle
            cx={arcX}
            cy={arcY}
            r="12"
            fill="var(--accent)"
            stroke="white"
            strokeWidth="3"
            style={{ filter: "drop-shadow(0 0 10px var(--accent))" }}
          />
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="28" fontWeight="900" fill="var(--text)" style={{ letterSpacing: "-1px" }}>
            {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="10" fontWeight="bold" fill="var(--muted)" className="uppercase tracking-widest opacity-40">
            drag dial
          </text>
        </svg>
      </div>

      <div className="flex gap-1.5 flex-wrap justify-center max-w-[320px]">
        {[15, 30, 45, 60, 90, 120, 180].map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 glass rounded-xl transition-all"
            style={{
              background: minutes === m ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "rgba(255,255,255,0.02)",
              color: minutes === m ? "white" : "var(--muted)",
              border: `1px solid ${minutes === m ? "transparent" : "var(--border)"}`,
            }}
          >
            {m >= 60 ? `${m / 60}h` : `${m}m`}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Focus Audio Synthesizer ───────────────────────────────────────────────────
class CozyRainSynthesizer {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioScheduledSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private currentVolume: number = 0.15;

  start() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Pink noise algorithm (soft rain simulation)
      let b0, b1, b2, b3, b4, b5, b6;
      b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
        output[i] = pink * 0.08; 
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      // Soothing low-pass filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(650, this.ctx.currentTime); // Gentle rumble

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      noise.start(0);
      this.noiseNode = noise;
    } catch (e) {
      console.error("Audio Context not supported or failed to initialize", e);
    }
  }

  setVolume(vol: number) {
    this.currentVolume = vol;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  stop() {
    if (this.noiseNode) {
      try {
        this.noiseNode.stop();
      } catch (e) {}
      this.noiseNode.disconnect();
      this.noiseNode = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Play a nice focus chime
function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
    osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.45); // C6

    gain.gain.setValueAtTime(0.0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.6);
  } catch (e) {}
}

// ── Goal Interface ────────────────────────────────────────────────────────────
interface SessionGoal {
  id: string;
  text: string;
  done: boolean;
}

type TimeMode = "stopwatch" | "pomodoro" | "manual";
type TimerMode = "idle" | "running" | "paused";

export default function LogTimeClient({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();

  // Selections
  const [subjectId, setSubjectId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [note, setNote] = useState("");

  // Goals
  const [goals, setGoals] = useState<SessionGoal[]>([]);
  const [newGoalText, setNewGoalText] = useState("");

  // Study modes
  const [timeMode, setTimeMode] = useState<TimeMode>("stopwatch");
  const [timerMode, setTimerMode] = useState<TimerMode>("idle");
  const [elapsed, setElapsed] = useState(0);

  // Pomodoro custom settings
  const [pomoDuration, setPomoDuration] = useState(25); // minutes
  const [pomoState, setPomoState] = useState<"focus" | "break">("focus");

  // Manual Dial setting
  const [manualMinutes, setManualMinutes] = useState(45);
  const [saving, setSaving] = useState(false);

  // Audio Ambience
  const [isRainPlaying, setIsRainPlaying] = useState(false);
  const [rainVolume, setRainVolume] = useState(0.15);
  const rainSynthRef = useRef<CozyRainSynthesizer | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // localStorage keys for timer recovery
  const LS_MODE = "gateplan_timemode";
  const LS_START = "gateplan_timer_start";
  const LS_PAUSE = "gateplan_timer_pause";
  const LS_POMO_DUR = "gateplan_pomo_dur";
  const LS_POMO_STATE = "gateplan_pomo_state";

  // Synthesizer setup
  useEffect(() => {
    rainSynthRef.current = new CozyRainSynthesizer();
    return () => {
      if (rainSynthRef.current) {
        rainSynthRef.current.stop();
      }
    };
  }, []);

  // Restore State
  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      router.replace("/");
      return;
    }

    const storedMode = localStorage.getItem(LS_MODE) as TimeMode;
    const storedStart = localStorage.getItem(LS_START);
    const storedPause = localStorage.getItem(LS_PAUSE);
    const storedPomoDur = localStorage.getItem(LS_POMO_DUR);
    const storedPomoState = localStorage.getItem(LS_POMO_STATE) as "focus" | "break";

    if (storedMode) setTimeMode(storedMode);
    if (storedPomoDur) setPomoDuration(parseInt(storedPomoDur, 10));
    if (storedPomoState) setPomoState(storedPomoState);

    if (storedStart) {
      const startMs = parseInt(storedStart, 10);
      const currentElapsed = Math.floor((Date.now() - startMs) / 1000);
      setElapsed(currentElapsed);
      setTimerMode("running");

      intervalRef.current = setInterval(() => {
        const nextElapsed = Math.floor((Date.now() - startMs) / 1000);
        
        // Handle Pomodoro expiry
        if (storedMode === "pomodoro" && storedPomoDur) {
          const limit = parseInt(storedPomoDur, 10) * 60;
          if (nextElapsed >= limit) {
            playChime();
            setElapsed(limit);
            setTimerMode("paused");
            localStorage.removeItem(LS_START);
            localStorage.setItem(LS_PAUSE, String(limit));
            if (intervalRef.current) clearInterval(intervalRef.current);
            alert(storedPomoState === "break" ? "Break finished! Time to Focus!" : "Great Focus Session! Take a break.");
            return;
          }
        }
        setElapsed(nextElapsed);
      }, 500);
    } else if (storedPause) {
      setElapsed(parseInt(storedPause, 10));
      setTimerMode("paused");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Sync state changes with sound Synthesizer
  useEffect(() => {
    if (rainSynthRef.current) {
      rainSynthRef.current.setVolume(rainVolume);
    }
  }, [rainVolume]);

  const selectedSubject = subjects.find((s) => s.id === subjectId) ?? null;
  const modules = selectedSubject?.modules ?? [];
  const selectedModule = modules.find((m) => m.id === moduleId) ?? null;

  // Sound play helper
  function handleRainToggle() {
    if (!rainSynthRef.current) return;
    if (isRainPlaying) {
      rainSynthRef.current.stop();
      setIsRainPlaying(false);
    } else {
      rainSynthRef.current.start();
      rainSynthRef.current.setVolume(rainVolume);
      setIsRainPlaying(true);
    }
  }

  // Timer controls
  function startTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const startMs = Date.now() - elapsed * 1000;
    localStorage.setItem(LS_START, String(startMs));
    localStorage.setItem(LS_MODE, timeMode);
    localStorage.setItem(LS_POMO_DUR, String(pomoDuration));
    localStorage.setItem(LS_POMO_STATE, pomoState);
    localStorage.removeItem(LS_PAUSE);

    intervalRef.current = setInterval(() => {
      const nextElapsed = Math.floor((Date.now() - startMs) / 1000);
      
      // Pomodoro limit check
      if (timeMode === "pomodoro") {
        const limit = pomoDuration * 60;
        if (nextElapsed >= limit) {
          playChime();
          setElapsed(limit);
          setTimerMode("paused");
          localStorage.removeItem(LS_START);
          localStorage.setItem(LS_PAUSE, String(limit));
          if (intervalRef.current) clearInterval(intervalRef.current);
          alert(pomoState === "break" ? "Break finished! Ready to Study!" : "Focus Session finished! Time to relax.");
          return;
        }
      }
      setElapsed(nextElapsed);
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

  // Preset Pomodoro durations
  function handlePomoPreset(mins: number, isBreak = false) {
    resetTimer();
    setPomoDuration(mins);
    setPomoState(isBreak ? "break" : "focus");
    localStorage.setItem(LS_POMO_DUR, String(mins));
    localStorage.setItem(LS_POMO_STATE, isBreak ? "break" : "focus");
  }

  // Goal Checklist Actions
  function addGoal() {
    if (!newGoalText.trim()) return;
    const newGoal: SessionGoal = {
      id: Date.now().toString(),
      text: newGoalText.trim(),
      done: false,
    };
    setGoals((prev) => [...prev, newGoal]);
    setNewGoalText("");
  }

  function toggleGoal(id: string) {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g))
    );
  }

  function deleteGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  // Formatting helpers
  function fmtStopwatch(s: number) {
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function fmtPomodoro(s: number) {
    const limit = pomoDuration * 60;
    const remaining = Math.max(0, limit - s);
    const m = Math.floor(remaining / 60);
    const sec = remaining % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  const durationMinutes =
    timeMode === "manual"
      ? manualMinutes
      : Math.max(1, Math.round(elapsed / 60));

  const canLog = !!selectedSubject && (timeMode === "manual" ? manualMinutes >= 1 : elapsed > 0);

  // Save session Study Log
  async function handleLog() {
    const u = getCurrentUser();
    if (!u || !selectedSubject) return;

    setSaving(true);
    try {
      // Compile session goals checklist results to the final saved study note
      const finishedGoals = goals.filter((g) => g.done).map((g) => g.text);
      const pendingGoals = goals.filter((g) => !g.done).map((g) => g.text);
      
      let finalNote = note.trim();
      let goalsSummary = "";
      if (finishedGoals.length > 0) {
        goalsSummary += ` Accomplished: ${finishedGoals.join(", ")}`;
      }
      if (pendingGoals.length > 0) {
        goalsSummary += ` (Pending: ${pendingGoals.join(", ")})`;
      }
      
      if (goalsSummary) {
        finalNote = finalNote ? `${finalNote} | Goals: ${goalsSummary}` : `Goals: ${goalsSummary}`;
      }

      const sessionData = {
        startedAt: Date.now(),
        durationMinutes: Math.max(1, durationMinutes),
        subjectName: selectedSubject.name,
        moduleName: selectedModule?.name || undefined,
        note: finalNote || undefined,
      };

      await logStudySession(u, sessionData);
      
      // Clear timers
      localStorage.removeItem(LS_START);
      localStorage.removeItem(LS_PAUSE);
      localStorage.removeItem(LS_MODE);
      localStorage.removeItem(LS_POMO_DUR);
      localStorage.removeItem(LS_POMO_STATE);

      // Stop sounds
      if (rainSynthRef.current) {
        rainSynthRef.current.stop();
      }
      router.push("/activity?tab=sessions");
    } catch (err) {
      console.error("Failed to log session:", err);
      alert("Failed to save session. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Circular Pomodoro Progress Path
  const pomoTotal = pomoDuration * 60;
  const pomoAngle = pomoTotal > 0 ? (elapsed / pomoTotal) * 360 : 0;
  const pomoR = 90;
  const pomoCX = 110;
  const pomoCY = 110;
  const pomoEndRad = ((pomoAngle - 90) * Math.PI) / 180;
  const pomoX = pomoCX + pomoR * Math.cos(pomoEndRad);
  const pomoY = pomoCY + pomoR * Math.sin(pomoEndRad);
  const pomoArc = `M ${pomoCX} ${pomoCY - pomoR} A ${pomoR} ${pomoR} 0 ${pomoAngle > 180 ? 1 : 0} 1 ${pomoX} ${pomoY}`;

  const themeColor =
    timeMode === "pomodoro"
      ? pomoState === "break"
        ? "var(--orange)"
        : "var(--green)"
      : "var(--accent)";

  const glowShadowStyle =
    timerMode === "running"
      ? { boxShadow: `0 0 40px ${themeColor}22`, border: `1px solid ${themeColor}33` }
      : { border: "1px solid var(--border)" };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--bg)] py-8 px-4 text-[var(--text)]">
      {/* Dynamic breathing animations in focus/study mode */}
      <style>{`
        @keyframes breathe-focus {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(34, 211, 165, 0.1)); }
          50% { transform: scale(1.015); filter: drop-shadow(0 0 25px rgba(34, 211, 165, 0.4)); }
        }
        @keyframes breathe-break {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.1)); }
          50% { transform: scale(1.015); filter: drop-shadow(0 0 25px rgba(245, 158, 11, 0.4)); }
        }
        @keyframes breathe-stopwatch {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(99, 120, 255, 0.1)); }
          50% { transform: scale(1.015); filter: drop-shadow(0 0 25px rgba(99, 120, 255, 0.4)); }
        }
        .animate-study-focus { animation: breathe-focus 6s ease-in-out infinite; }
        .animate-study-break { animation: breathe-break 6s ease-in-out infinite; }
        .animate-study-stopwatch { animation: breathe-stopwatch 6s ease-in-out infinite; }
      `}</style>

      {/* Decorative Orbs */}
      <div className="glow-orb w-[500px] h-[500px] -top-80 -right-80 opacity-20 pointer-events-none" style={{ background: "rgba(99,120,255,0.06)" }} />
      <div className="glow-orb w-[400px] h-[400px] -bottom-40 -left-40 opacity-20 pointer-events-none" style={{ background: "rgba(34,211,165,0.04)" }} />

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Header Navigation */}
        <header className="flex items-center justify-between mb-8 fade-in">
          <Link href="/dashboard" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--accent)] transition-all">
            <ChevronLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <div className="text-right">
            <h1 className="text-xl font-bold flex items-center gap-2 justify-end">
              <span className="grad-text">Study</span> Focus Center
            </h1>
            <p className="text-[9px] text-[var(--muted)] uppercase font-bold tracking-widest mt-1">Immersive learning timer & mixer</p>
          </div>
        </header>

        {/* main layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Focus Space & Timer */}
          <div className="lg:col-span-6 flex flex-col gap-6 fade-in-1">
            
            {/* Timer mode selector card */}
            <div className="glass p-1">
              <div className="flex gap-1 bg-white/5 rounded-xl border border-white/5 p-0.5">
                {(["stopwatch", "pomodoro", "manual"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      resetTimer();
                      setTimeMode(m);
                    }}
                    disabled={timerMode !== "idle"}
                    className="flex-1 text-xs py-2 rounded-lg font-bold transition-all disabled:opacity-50"
                    style={{
                      background: timeMode === m ? `linear-gradient(135deg, ${themeColor}, var(--accent2))` : "transparent",
                      color: timeMode === m ? "white" : "var(--muted)",
                    }}
                  >
                    {m === "stopwatch" ? "⏱ Stopwatch" : m === "pomodoro" ? "⏳ Pomodoro" : "✏️ Manual Dial"}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Interactive Visualizer Display */}
            <div
              className={`glass p-6 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 min-h-[360px] ${
                timerMode === "running"
                  ? timeMode === "pomodoro"
                    ? pomoState === "break"
                      ? "animate-study-break"
                      : "animate-study-focus"
                    : "animate-study-stopwatch"
                  : ""
              }`}
              style={glowShadowStyle}
            >
              <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />

              {/* LIVE STOPWATCH */}
              {timeMode === "stopwatch" && (
                <div className="flex flex-col items-center gap-6 select-none">
                  {/* Outer circle visual mockup */}
                  <div className="w-[180px] h-[180px] rounded-full border-4 border-dashed border-white/5 flex items-center justify-center relative">
                    <div className="absolute inset-2 rounded-full border border-white/5 flex flex-col items-center justify-center">
                      <Clock size={20} className="opacity-20 mb-2" />
                      <span className="text-3xl font-mono font-black tracking-tighter text-[var(--text)] tabular-nums">
                        {fmtStopwatch(elapsed)}
                      </span>
                      <span className="text-[8px] uppercase tracking-widest font-black opacity-30 mt-1">stopwatch</span>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    {timerMode === "idle" && (
                      <button
                        onClick={startTimer}
                        disabled={!selectedSubject}
                        className="px-6 py-2.5 rounded-xl font-bold text-xs transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
                        style={{ background: `linear-gradient(135deg, var(--accent), var(--accent2))`, color: "white" }}
                      >
                        Start Focus
                      </button>
                    )}
                    {timerMode === "running" && (
                      <button
                        onClick={pauseTimer}
                        className="px-6 py-2.5 rounded-xl font-bold text-xs transition-all hover:opacity-90 uppercase tracking-wider bg-orange-500/10 border border-orange-500/20 text-orange-500"
                      >
                        Pause Timer
                      </button>
                    )}
                    {timerMode === "paused" && (
                      <button
                        onClick={startTimer}
                        className="px-6 py-2.5 rounded-xl font-bold text-xs transition-all hover:opacity-90 uppercase tracking-wider"
                        style={{ background: `linear-gradient(135deg, var(--accent), var(--accent2))`, color: "white" }}
                      >
                        Resume Focus
                      </button>
                    )}
                    {timerMode !== "idle" && (
                      <button
                        onClick={handleLog}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs transition-all hover:opacity-90 uppercase tracking-wider bg-green-500/15 border border-green-500/30 text-green-500"
                      >
                        Save & Log
                      </button>
                    )}
                    {timerMode !== "idle" && (
                      <button
                        onClick={() => {
                          if (confirm("Reset the stopwatch? This will discard elapsed focus time.")) resetTimer();
                        }}
                        className="px-4 py-2.5 rounded-xl font-bold text-xs transition-all hover:opacity-90 uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-500"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* LIVE POMODORO COUNTDOWN */}
              {timeMode === "pomodoro" && (
                <div className="flex flex-col items-center gap-6 select-none">
                  
                  {/* SVG Pomodoro Circular Progress */}
                  <div className="relative">
                    <svg width="180" height="180" viewBox="0 0 220 220" className="transform -rotate-90">
                      <circle cx="110" cy="110" r="90" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                      {elapsed > 0 && <path d={pomoArc} fill="none" stroke={themeColor} strokeWidth="12" strokeLinecap="round" />}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[8px] uppercase tracking-widest font-black opacity-45 px-2 py-0.5 rounded" 
                        style={{ background: pomoState === "break" ? "rgba(245,158,11,0.12)" : "rgba(34,211,165,0.12)", color: themeColor }}>
                        {pomoState === "break" ? "Break" : "Focus"}
                      </span>
                      <span className="text-3xl font-mono font-black tracking-tighter text-[var(--text)] tabular-nums mt-1">
                        {fmtPomodoro(elapsed)}
                      </span>
                      <span className="text-[9px] font-bold opacity-30 mt-0.5">{pomoDuration}m session</span>
                    </div>
                  </div>

                  {/* Preset quick actions */}
                  <div className="flex gap-1.5 flex-wrap justify-center max-w-[320px]">
                    {[
                      { l: "🍅 25m Focus", m: 25, b: false },
                      { l: "⚡ 50m Focus", m: 50, b: false },
                      { l: "🍵 5m Break", m: 5, b: true },
                      { l: "🏖 15m Break", m: 15, b: true }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePomoPreset(item.m, item.b)}
                        disabled={timerMode !== "idle"}
                        className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-xl border border-white/5 bg-white/5 transition-all disabled:opacity-40 hover:bg-white/10"
                        style={{ color: pomoDuration === item.m && pomoState === (item.b ? "break" : "focus") ? themeColor : "var(--muted)" }}
                      >
                        {item.l}
                      </button>
                    ))}
                  </div>

                  {/* Pomodoro Action Buttons */}
                  <div className="flex gap-2">
                    {timerMode === "idle" && (
                      <button
                        onClick={startTimer}
                        disabled={!selectedSubject}
                        className="px-6 py-2.5 rounded-xl font-bold text-xs transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
                        style={{ background: `linear-gradient(135deg, ${themeColor}, var(--accent2))`, color: "white" }}
                      >
                        Start Focus
                      </button>
                    )}
                    {timerMode === "running" && (
                      <button
                        onClick={pauseTimer}
                        className="px-6 py-2.5 rounded-xl font-bold text-xs transition-all hover:opacity-90 uppercase tracking-wider bg-orange-500/10 border border-orange-500/20 text-orange-500"
                      >
                        Pause Session
                      </button>
                    )}
                    {timerMode === "paused" && (
                      <button
                        onClick={startTimer}
                        className="px-6 py-2.5 rounded-xl font-bold text-xs transition-all hover:opacity-90 uppercase tracking-wider"
                        style={{ background: `linear-gradient(135deg, ${themeColor}, var(--accent2))`, color: "white" }}
                      >
                        Resume Focus
                      </button>
                    )}
                    {timerMode !== "idle" && elapsed > 0 && (
                      <button
                        onClick={handleLog}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs transition-all hover:opacity-90 uppercase tracking-wider bg-green-500/15 border border-green-500/30 text-green-500"
                      >
                        Stop & Log
                      </button>
                    )}
                    {timerMode !== "idle" && (
                      <button
                        onClick={() => {
                          if (confirm("Reset the Pomodoro countdown?")) resetTimer();
                        }}
                        className="px-4 py-2.5 rounded-xl font-bold text-xs transition-all hover:opacity-90 uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-500"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* MANUAL drag dial */}
              {timeMode === "manual" && (
                <div className="fade-in">
                  <TimeDial minutes={manualMinutes} onChange={setManualMinutes} />
                </div>
              )}

              {/* Warnings / Assistive states */}
              {!selectedSubject && timerMode === "idle" && (
                <div className="absolute bottom-4 text-center">
                  <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: "var(--accent2)" }}>
                    Select a subject in the sidebar to start timer
                  </p>
                </div>
              )}
            </div>

            {/* Premium synthesized cozy ambience mixer */}
            <div className="glass p-5 border border-white/5 relative overflow-hidden flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Headphones size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">Ambient Sound Synthesizer</h3>
                    <p className="text-[9px] opacity-40">Synthesized pure low-pass rain frequency</p>
                  </div>
                </div>
                <button
                  onClick={handleRainToggle}
                  className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border shadow-lg"
                  style={{
                    background: isRainPlaying ? "var(--tint-green)" : "rgba(255,255,255,0.02)",
                    color: isRainPlaying ? "var(--green)" : "var(--muted)",
                    borderColor: isRainPlaying ? "var(--green)" : "var(--border)"
                  }}
                >
                  {isRainPlaying ? "🎧 Playing Sound" : "🔇 Cozy Rain"}
                </button>
              </div>

              {isRainPlaying && (
                <div className="flex items-center gap-4 fade-in-1">
                  <Volume2 size={14} className="text-[var(--muted)] flex-shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="0.4"
                    step="0.01"
                    value={rainVolume}
                    onChange={(e) => setRainVolume(parseFloat(e.target.value))}
                    className="flex-1 accent-indigo-500 h-1 rounded-full cursor-pointer bg-white/10"
                  />
                  <span className="text-[9px] font-bold text-[var(--muted)] tabular-nums w-8 text-right">
                    {Math.round((rainVolume / 0.4) * 100)}%
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Active Session Goals & Subject Selections */}
          <div className="lg:col-span-6 flex flex-col gap-6 fade-in-2">
            
            {/* Subject module selectors */}
            <div className="glass p-5 border border-white/5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 rounded-full" style={{ background: "linear-gradient(to bottom, var(--accent), var(--accent2))" }} />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">Session Classification</h2>
              </div>

              {/* Subject dropdown */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5 opacity-40">SELECT SUBJECT</label>
                <div className="relative">
                  <select
                    value={subjectId}
                    onChange={(e) => {
                      setSubjectId(e.target.value);
                      setModuleId("");
                    }}
                    style={selectStyle}
                  >
                    <option value="">— Choose a Subject —</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs opacity-30">▾</span>
                </div>
              </div>

              {/* Module dropdown */}
              {selectedSubject && (
                <div className="fade-in-1">
                  <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5 opacity-40">SELECT MODULE (optional)</label>
                  <div className="relative">
                    <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} style={selectStyle}>
                      <option value="">— Choose a Module —</option>
                      {modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs opacity-30">▾</span>
                  </div>
                </div>
              )}
            </div>

            {/* Session goals checklist */}
            <div className="glass p-5 border border-white/5 flex flex-col gap-4"
              style={{ opacity: selectedSubject ? 1 : 0.4, pointerEvents: selectedSubject ? "auto" : "none", transition: "opacity 0.2s" }}>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-emerald-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">Session Focus Goals</h2>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  {goals.filter((g) => g.done).length}/{goals.length} Accomplished
                </span>
              </div>

              {/* New goal input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGoalText}
                  onChange={(e) => setNewGoalText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGoal()}
                  placeholder="e.g. Finish ripple carry adder delay problems"
                  className="flex-1 text-sm px-3.5 py-2.5 rounded-xl outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
                <button
                  onClick={addGoal}
                  className="px-3.5 rounded-xl border border-white/5 bg-white/5 transition-all hover:bg-white/10 text-emerald-400 flex items-center justify-center cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Goals list */}
              {goals.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                  {goals.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between p-3 rounded-xl border transition-all"
                      style={{
                        background: g.done ? "var(--tint-green)" : "var(--surface)",
                        borderColor: g.done ? "var(--tint-green-border)" : "var(--border)",
                      }}
                    >
                      <button
                        onClick={() => toggleGoal(g.id)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                      >
                        <div
                          className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            background: g.done ? "var(--green)" : "transparent",
                            borderColor: g.done ? "var(--green)" : "var(--border)",
                          }}
                        >
                          {g.done && (
                            <svg width="10" height="10" viewBox="0 0 20 20" fill="white">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span
                          className="text-xs truncate transition-all"
                          style={{
                            color: g.done ? "var(--muted)" : "var(--text)",
                            textDecoration: g.done ? "line-through" : "none",
                          }}
                        >
                          {g.text}
                        </span>
                      </button>
                      
                      <button
                        onClick={() => deleteGoal(g.id)}
                        className="w-6 h-6 rounded-md hover:bg-red-500/10 text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 lg:opacity-100 flex-shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/5 py-6 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">No session goals added yet</p>
                </div>
              )}
            </div>

            {/* Note & Logging Card */}
            <div className="glass p-5 border border-white/5 flex flex-col gap-4"
              style={{ opacity: selectedSubject ? 1 : 0.4, pointerEvents: selectedSubject ? "auto" : "none", transition: "opacity 0.2s" }}>
              
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 rounded-full bg-purple-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">Notes & Documentation</h2>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5 opacity-40">ADDITIONAL LOG NOTES (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Cleared all PYQs for Priority Encoder. Understood the propagation delay equations."
                  rows={2}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl outline-none resize-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>

              {/* Compile Log & Save Session Button */}
              {(timeMode === "manual" || elapsed > 0) && (
                <button
                  onClick={handleLog}
                  disabled={!canLog || saving}
                  className="w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all cursor-pointer"
                  style={{
                    background: canLog ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "rgba(255,255,255,0.02)",
                    color: canLog ? "white" : "var(--muted)",
                    opacity: saving ? 0.7 : 1,
                    boxShadow: canLog ? "0 4px 20px rgba(99,120,255,0.2)" : "none",
                    border: canLog ? "none" : "1px solid var(--border)"
                  }}
                >
                  {saving
                    ? "Logging Session..."
                    : `✓ Save Session (${durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m` : `${durationMinutes}m`})`}
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

const selectStyle = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "13px",
  fontWeight: "bold",
  width: "100%",
  outline: "none",
  appearance: "none" as const,
  cursor: "pointer",
};
