'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SUBJECTS, SLOTS } from '@/data/subjects';
import useStore from '@/store/useStore';
import { Play, Pause, RotateCcw, Flag, Maximize2, Minimize2, X } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (ms, pad = true) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${pad ? String(m).padStart(2,'0') : m}:${String(sec).padStart(2,'0')}`;
};

const fmtShort = (ms) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
};

// Circular SVG progress ring
function Ring({ pct, size = 260, stroke = 14, color = 'var(--accent)', children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct, 1) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface2)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.4s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

export default function FocusTimer() {
  const { logSlot } = useStore();

  // Timer state
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);       // ms
  const [laps, setLaps] = useState([]);             // [{label, duration, startAt}]
  const [lapStart, setLapStart] = useState(0);      // elapsed at last lap
  const [sessions, setSessions] = useState([]);     // completed sessions [{topic, duration, questions, date}]

  // Config
  const [mode, setMode] = useState('stopwatch');    // 'stopwatch' | 'pomodoro'
  const [pomoDur, setPomoDur] = useState(25 * 60 * 1000);
  const [breakDur, setBreakDur] = useState(5 * 60 * 1000);
  const [pomoPhase, setPomoPhase] = useState('work'); // 'work' | 'break'

  // Log form
  const [showLog, setShowLog] = useState(false);
  const [logForm, setLogForm] = useState({ topic: '', questions: '', notes: '' });

  // Fullscreen
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Interval
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const baseElapsedRef = useRef(0);

  const tick = useCallback(() => {
    const now = Date.now();
    const newElapsed = baseElapsedRef.current + (now - startTimeRef.current);
    setElapsed(newElapsed);

    // Pomodoro auto-stop
    if (mode === 'pomodoro') {
      const target = pomoPhase === 'work' ? pomoDur : breakDur;
      if (newElapsed >= target) {
        clearInterval(intervalRef.current);
        setRunning(false);
        baseElapsedRef.current = target;
        setElapsed(target);
        // Play a beep via Web Audio
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
          osc.start(); osc.stop(ctx.currentTime + 0.8);
        } catch {}
      }
    }
  }, [mode, pomoPhase, pomoDur, breakDur]);

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(tick, 200);
    } else {
      clearInterval(intervalRef.current);
      baseElapsedRef.current = elapsed;
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // Update tick callback without restarting interval
  useEffect(() => {
    if (running) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(tick, 200);
    }
  }, [tick]);

  const start = () => {
    baseElapsedRef.current = elapsed;
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    baseElapsedRef.current = 0;
    setLaps([]);
    setLapStart(0);
    if (mode === 'pomodoro') setPomoPhase('work');
  };

  const lap = () => {
    if (!running) return;
    const lapDuration = elapsed - lapStart;
    setLaps(prev => [...prev, { label: `Lap ${prev.length + 1}`, duration: lapDuration, at: elapsed }]);
    setLapStart(elapsed);
  };

  const finishSession = () => {
    pause();
    setShowLog(true);
  };

  const saveSession = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const hours = elapsed / 3600000;
    const session = {
      topic: logForm.topic,
      questions: +logForm.questions || 0,
      notes: logForm.notes,
      duration: elapsed,
      date: today,
      laps: laps.length,
      savedAt: Date.now(),
    };
    setSessions(prev => [session, ...prev]);

    // Sync to store if topic selected
    if (logForm.topic) {
      logSlot(today, `focus_${Date.now()}`, {
        topic: logForm.topic,
        questions: +logForm.questions || 0,
        notes: logForm.notes,
        hoursStudied: hours,
      });
    }

    setShowLog(false);
    setLogForm({ topic: '', questions: '', notes: '' });
    reset();
  };

  const toggleFullscreen = () => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Pomodoro progress
  const pomoTarget = pomoPhase === 'work' ? pomoDur : breakDur;
  const ringPct = mode === 'pomodoro' ? elapsed / pomoTarget : (elapsed % (60 * 60 * 1000)) / (60 * 60 * 1000);
  const ringColor = mode === 'pomodoro'
    ? (pomoPhase === 'work' ? 'var(--accent)' : 'var(--green)')
    : running ? 'var(--accent)' : 'var(--muted)';

  const currentLapElapsed = elapsed - lapStart;

  return (
    <div ref={containerRef} style={{
      background: fullscreen ? 'var(--bg)' : 'transparent',
      minHeight: fullscreen ? '100vh' : 'auto',
      display: 'flex', flexDirection: 'column',
      padding: fullscreen ? '40px' : '0',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 2 }}>Focus Timer</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Deep work sessions with lap tracking</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={toggleFullscreen} title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {fullscreen ? 'Exit Focus' : 'Focus Mode'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: fullscreen ? '1fr' : '1fr 340px', gap: 24, alignItems: 'start' }} className={fullscreen ? '' : 'focus-grid'}>

        {/* Left: Timer */}
        <div>
          {/* Mode selector */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['stopwatch', 'pomodoro'].map(m => (
                <button key={m} className={`btn btn-sm ${mode === m ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => { if (!running) { setMode(m); reset(); } }}
                  style={{ textTransform: 'capitalize' }}>
                  {m === 'pomodoro' ? '🍅 Pomodoro' : '⏱ Stopwatch'}
                </button>
              ))}
              {mode === 'pomodoro' && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge ${pomoPhase === 'work' ? 'badge-pending' : 'badge-done'}`}>
                    {pomoPhase === 'work' ? 'Work' : 'Break'}
                  </span>
                </div>
              )}
            </div>

            {/* Pomodoro config */}
            {mode === 'pomodoro' && !running && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Work</span>
                  <select value={pomoDur / 60000} onChange={e => setPomoDur(+e.target.value * 60000)} style={{ width: 80 }}>
                    {[15,20,25,30,45,50,60].map(v => <option key={v} value={v}>{v} min</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Break</span>
                  <select value={breakDur / 60000} onChange={e => setBreakDur(+e.target.value * 60000)} style={{ width: 80 }}>
                    {[5,10,15,20].map(v => <option key={v} value={v}>{v} min</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Ring + time display */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0' }}>
              <Ring pct={ringPct} size={fullscreen ? 320 : 240} stroke={fullscreen ? 18 : 14} color={ringColor}>
                <div style={{ fontFamily: 'monospace', fontSize: fullscreen ? 52 : 42, fontWeight: 900, color: 'var(--text)', letterSpacing: '-2px', lineHeight: 1 }}>
                  {mode === 'pomodoro' ? fmt(Math.max(0, pomoTarget - elapsed)) : fmt(elapsed)}
                </div>
                {mode === 'stopwatch' && laps.length > 0 && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
                    Lap {laps.length + 1}: {fmt(currentLapElapsed)}
                  </div>
                )}
                {mode === 'pomodoro' && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
                    {pomoPhase === 'work' ? `${Math.round(pomoDur / 60000)} min focus` : `${Math.round(breakDur / 60000)} min break`}
                  </div>
                )}
              </Ring>

              {/* Controls */}
              <div style={{ display: 'flex', gap: 12, marginTop: 24, alignItems: 'center' }}>
                <button className="btn btn-ghost" onClick={reset} title="Reset">
                  <RotateCcw size={16} />
                </button>
                {mode === 'stopwatch' && (
                  <button className="btn btn-ghost" onClick={lap} disabled={!running} title="Lap">
                    <Flag size={16} /> Lap
                  </button>
                )}
                <button
                  onClick={running ? pause : start}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: running ? 'var(--red)' : 'var(--accent)',
                    color: '#fff', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 20px ${running ? 'var(--red)' : 'var(--accent)'}44`,
                    transition: 'all 0.2s',
                  }}
                >
                  {running ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: 3 }} />}
                </button>
                {mode === 'pomodoro' && !running && elapsed > 0 && (
                  <button className="btn btn-ghost" onClick={() => {
                    setPomoPhase(p => p === 'work' ? 'break' : 'work');
                    reset();
                  }}>
                    {pomoPhase === 'work' ? '→ Break' : '→ Work'}
                  </button>
                )}
                <button className="btn btn-primary" onClick={finishSession} disabled={elapsed < 1000}>
                  Save Session
                </button>
              </div>
            </div>
          </div>

          {/* Laps */}
          {laps.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Laps</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...laps].reverse().map((lap, i) => {
                  const idx = laps.length - i;
                  const fastest = laps.reduce((min, l) => l.duration < min ? l.duration : min, Infinity);
                  const slowest = laps.reduce((max, l) => l.duration > max ? l.duration : max, 0);
                  const isFastest = lap.duration === fastest && laps.length > 1;
                  const isSlowest = lap.duration === slowest && laps.length > 1;
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', fontSize: 13 }}>
                      <span style={{ color: 'var(--muted)' }}>Lap {idx}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isFastest ? 'var(--green)' : isSlowest ? 'var(--red)' : 'var(--text)' }}>
                        {fmt(lap.duration)}
                        {isFastest && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--green)' }}>fastest</span>}
                        {isSlowest && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--red)' }}>slowest</span>}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>+{fmt(lap.at)}</span>
                    </div>
                  );
                })}
                {/* Current lap */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--accent-bg)', border: '1px solid var(--accent)44', fontSize: 13 }}>
                  <span style={{ color: 'var(--accent2)' }}>Lap {laps.length + 1} (current)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent2)' }}>{fmt(currentLapElapsed)}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>+{fmt(elapsed)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Sessions history */}
        {!fullscreen && (
          <div>
            <div className="card">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Today's Sessions</div>
              {sessions.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                  No sessions yet. Start the timer!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sessions.map((s, i) => {
                    const topic = SUBJECTS.flatMap(sub => sub.topics).find(t => t.id === s.topic);
                    return (
                      <div key={i} style={{ padding: '12px', borderRadius: 10, background: 'var(--surface2)', borderLeft: '3px solid var(--accent)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{topic?.name || 'Untagged'}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>{fmt(s.duration)}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 10 }}>
                          {s.questions > 0 && <span>{s.questions} questions</span>}
                          {s.laps > 0 && <span>{s.laps} laps</span>}
                          {s.notes && <span>📝 {s.notes.slice(0, 30)}{s.notes.length > 30 ? '…' : ''}</span>}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 13, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total today</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text)' }}>
                      {fmt(sessions.reduce((sum, s) => sum + s.duration, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick stats */}
            {sessions.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Session Stats</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>Sessions</span>
                    <span style={{ fontWeight: 600 }}>{sessions.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>Avg session</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmt(sessions.reduce((s, x) => s + x.duration, 0) / sessions.length)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>Longest</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--green)' }}>{fmt(Math.max(...sessions.map(s => s.duration)))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>Questions</span>
                    <span style={{ fontWeight: 600 }}>{sessions.reduce((s, x) => s + x.questions, 0)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save session modal */}
      {showLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Save Session</div>
              <button onClick={() => setShowLog(false)} style={{ color: 'var(--muted)' }}><X size={18} /></button>
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 32, fontWeight: 900, color: 'var(--accent2)' }}>{fmt(elapsed)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {laps.length > 0 ? `${laps.length} laps` : 'No laps'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Topic studied (optional)</label>
                <select value={logForm.topic} onChange={e => setLogForm(f => ({ ...f, topic: e.target.value }))}>
                  <option value="">— Untagged —</option>
                  {SUBJECTS.map(s => (
                    <optgroup key={s.id} label={s.name}>
                      {s.topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Questions solved</label>
                <input type="number" min={0} placeholder="0" value={logForm.questions} onChange={e => setLogForm(f => ({ ...f, questions: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea rows={2} placeholder="What did you cover?" value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveSession}>Save & Log Progress</button>
                <button className="btn btn-ghost" onClick={() => setShowLog(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
