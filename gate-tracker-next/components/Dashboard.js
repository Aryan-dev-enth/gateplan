'use client';
import { useState, useEffect } from 'react';
import useStore from '@/store/useStore';
import { SUBJECTS, SLOTS } from '@/data/subjects';
import { DAILY_PLAN } from '@/data/dailyPlan';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from 'date-fns';

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

function CalendarWidget({ dailyHours, studiedDates }) {
  const [viewDate, setViewDate] = useState(new Date());
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const startPad = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const today = todayStr();

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{format(viewDate, 'MMMM yyyy')}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setViewDate(new Date())}>Today</button>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>›</button>
        </div>
      </div>
      {/* Day labels */}
      <div className="cal-grid" style={{ marginBottom: 6 }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', fontWeight: 600, padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      {/* Padding cells + days */}
      <div className="cal-grid">
        {Array.from({ length: startPad }, (_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const ds = format(day, 'yyyy-MM-dd');
          const studied = studiedDates?.includes(ds);
          const hours = dailyHours[ds] || 0;
          const todayDay = ds === today;
          return (
            <div
              key={ds}
              className={`cal-day ${todayDay ? 'today' : ''} ${studied ? 'studied' : ''}`}
              title={`${ds}${hours > 0 ? ` · ${hours.toFixed(1)}h` : ''}`}
            >
              <span style={{ fontSize: 12 }}>{day.getDate()}</span>
              {hours > 0 && !studied && <span className="dot" />}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent)', display: 'inline-block' }} /> Studied
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, border: '1.5px solid var(--accent)', display: 'inline-block' }} /> Today
        </span>
      </div>
    </div>
  );
}

function StreakRow({ streak }) {
  const today = todayStr();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = format(addDays(new Date(today + 'T12:00:00'), i - 6), 'yyyy-MM-dd');
    return { d, studied: streak.studiedDates?.includes(d), label: format(new Date(d + 'T12:00:00'), 'EEE') };
  });
  return (
    <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent2)', lineHeight: 1 }}>🔥 {streak.current}</span>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>day streak</span>
        </div>
        {streak.longest > 0 && (
          <span style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--surface2)', padding: '4px 10px', borderRadius: 99, border: '1px solid var(--border)' }}>
            Best: {streak.longest} days
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {days.map(({ d, studied, label }) => (
          <div key={d} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: 32, borderRadius: 8,
              background: studied ? 'var(--accent)' : d === today ? 'var(--accent-bg)' : 'var(--surface2)',
              border: `1.5px solid ${d === today ? 'var(--accent)' : 'transparent'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, transition: 'all 0.2s',
            }}>
              {studied ? '✓' : d === today ? '·' : ''}
            </div>
            <div style={{ fontSize: 10, color: d === today ? 'var(--accent2)' : 'var(--muted)', marginTop: 5, fontWeight: d === today ? 700 : 400 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TodayPlan({ dailyLogs, customSlotAssignments }) {
  const today = todayStr();
  const plan = DAILY_PLAN[today] || {};
  const custom = customSlotAssignments[today] || {};
  const logs = dailyLogs[today] || {};
  const slots = SLOTS.map(sl => ({ ...sl, planned: custom[sl.id] ?? plan[sl.id] ?? '', log: logs[sl.id] || {} }));
  const totalPlanned = slots.filter(s => s.planned).length;
  const done = slots.filter(s => s.log.completed).length;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 2 }}>Today's Plan</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{format(new Date(today + 'T12:00:00'), 'EEEE, MMMM d')}</div>
        </div>
        <span className={`badge ${done === totalPlanned && totalPlanned > 0 ? 'badge-done' : 'badge-pending'}`}>
          {done}/{totalPlanned} done
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {slots.map(sl => (
          <div key={sl.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 16px', borderRadius: 10,
            background: sl.log.completed ? 'var(--green)12' : 'var(--surface2)',
            borderLeft: `3px solid ${sl.log.completed ? 'var(--green)' : sl.planned ? 'var(--accent)' : 'var(--border)'}`,
          }}>
            <div style={{ fontSize: 20, flexShrink: 0 }}>{sl.log.completed ? '✅' : sl.planned ? '📚' : '—'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: sl.log.completed ? 'var(--muted)' : 'var(--text)', textDecoration: sl.log.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sl.planned || <span style={{ color: 'var(--muted)', fontWeight: 400 }}>Nothing planned</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{sl.label} · {sl.time}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {sl.log.hoursStudied > 0 && <span className="badge badge-done">{sl.log.hoursStudied.toFixed(1)}h</span>}
              {sl.log.questions > 0 && <span className="badge badge-pending">{sl.log.questions}Q</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HoursRing({ value, max, label, color }) {
  const pct = Math.min(1, value / (max || 1));
  const r = 38; const circ = 2 * Math.PI * r; const dash = pct * circ;
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <svg width={96} height={96} viewBox="0 0 96 96" style={{ overflow: 'visible' }}>
        <circle cx={48} cy={48} r={r} fill="none" stroke="var(--surface2)" strokeWidth={9} />
        <circle cx={48} cy={48} r={r} fill="none" stroke={color} strokeWidth={9}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)' }} />
        <text x={48} y={52} textAnchor="middle" fill="var(--text)" fontSize={13} fontWeight={700}>{value.toFixed(1)}h</text>
      </svg>
      <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{Math.max(0, max - value).toFixed(1)}h left</div>
    </div>
  );
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const streak = useStore(s => s.streak);
  const dailyHours = useStore(s => s.dailyHours);
  const weeklyTarget = useStore(s => s.weeklyTarget);
  const topicStats = useStore(s => s.topicStats);
  const subjectStats = useStore(s => s.subjectStats);
  const backlog = useStore(s => s.backlog);
  const customSlotAssignments = useStore(s => s.customSlotAssignments);
  const dailyLogs = useStore(s => s.dailyLogs);

  if (!mounted) return null;

  const today = todayStr();
  const weekStart = startOfWeek(new Date(today + 'T12:00:00'), { weekStartsOn: 1 });
  const weekHours = Array.from({ length: 7 }, (_, i) => dailyHours[format(addDays(weekStart, i), 'yyyy-MM-dd')] || 0).reduce((a, b) => a + b, 0);
  const monthKey = today.slice(0, 7);
  const monthHours = Object.entries(dailyHours).filter(([d]) => d.startsWith(monthKey)).reduce((s, [, h]) => s + h, 0);
  const totalHours = Object.values(dailyHours).reduce((a, b) => a + b, 0);
  const monthTarget = weeklyTarget * 4.3;

  const weakest = SUBJECTS.map(s => {
    const ts = s.topics.map(t => topicStats[t.id] || {});
    const solved = ts.reduce((sum, t) => sum + (t.pyqSolved || 0) + (t.practiceSolved || 0), 0);
    const correct = ts.reduce((sum, t) => sum + (t.pyqCorrect || 0) + (t.practiceCorrect || 0), 0);
    return { name: s.name, color: s.color, acc: solved > 0 ? Math.round((correct / solved) * 100) : null };
  }).filter(s => s.acc !== null).sort((a, b) => a.acc - b.acc)[0];

  const highBacklog = backlog.filter(b => b.priority === 'High').length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>Good {greeting} 👋</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
          {format(new Date(today + 'T12:00:00'), 'EEEE, MMMM d yyyy')} · GATE CSE Prep
        </div>
      </div>

      {/* Alerts */}
      {(highBacklog > 0 || (weakest && weakest.acc < 60)) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {highBacklog > 0 && (
            <div className="card" style={{ borderColor: 'var(--red)', background: 'var(--red)08', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <span style={{ color: 'var(--red)', fontWeight: 600 }}>{highBacklog} high-priority backlog items</span>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>— check the Backlog tab</span>
            </div>
          )}
          {weakest && weakest.acc < 60 && (
            <div className="card" style={{ borderColor: 'var(--yellow)', background: 'var(--yellow)08', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>💡</span>
              <span style={{ color: 'var(--yellow)', fontWeight: 600 }}>Weak area: {weakest.name}</span>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{weakest.acc}% accuracy</span>
            </div>
          )}
        </div>
      )}

      <StreakRow streak={streak} />

      {/* Two-col layout: today plan + calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }} className="grid-2">
        <TodayPlan dailyLogs={dailyLogs} customSlotAssignments={customSlotAssignments} />
        <CalendarWidget dailyHours={dailyHours} studiedDates={streak.studiedDates} />
      </div>

      {/* Hours rings */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Hours Overview</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', gap: 16 }}>
          <HoursRing value={weekHours} max={weeklyTarget} label="This Week" color="var(--accent)" />
          <HoursRing value={monthHours} max={monthTarget} label="This Month" color="var(--accent2)" />
          <HoursRing value={totalHours} max={Math.max(totalHours, 500)} label="All Time" color="var(--green)" />
        </div>
      </div>

      {/* Subject progress */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Subject Progress</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="grid-2">
          {SUBJECTS.map(s => {
            const done = s.topics.filter(t => topicStats[t.id]?.done).length;
            const pct = Math.round((done / s.topics.length) * 100);
            const hours = subjectStats[s.id]?.hoursSpent || 0;
            return (
              <div key={s.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: s.color, fontWeight: 600 }}>{s.name}</span>
                  <span style={{ color: 'var(--muted)' }}>{done}/{s.topics.length} · {hours.toFixed(1)}h</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: s.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
