'use client';
import { useState } from 'react';
import useStore from '@/store/useStore';
import { SUBJECTS, SLOTS } from '@/data/subjects';
import { DAILY_PLAN } from '@/data/dailyPlan';
import { format } from 'date-fns';

// ── helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

// Group DAILY_PLAN by "YYYY-MM"
function groupByMonth(plan) {
  const months = {};
  for (const [date, slots] of Object.entries(plan)) {
    const key = date.slice(0, 7); // "2026-03"
    if (!months[key]) months[key] = {};
    months[key][date] = slots;
  }
  return months;
}

// Map slot text prefixes (before → or —) to subject ids
// Keys ordered longest-first so more specific keys win
const PREFIX_MAP = [
  ['digital logic',          'digital'],
  ['full revision',          null],       // multi-subject revision days → skip
  ['weak areas',             null],
  ['mixed pyqs',             null],
  ['light revision',         null],
  ['mock test',              null],
  ['discrete',               'discrete'],
  ['probability',            'maths'],
  ['calculus',               'maths'],
  ['maths',                  'maths'],
  ['la',                     'maths'],
  ['digital',                'digital'],
  ['compiler',               'compiler'],
  ['algo + ds',              'dsa'],
  ['algo',                   'dsa'],
  ['ds',                     'dsa'],
  ['dsa',                    'dsa'],
  ['dbms',                   'dbms'],
  ['coa',                    'coa'],
  ['toc',                    'toc'],
  ['os',                     'os'],
  ['cn',                     'cn'],
];

// Extract subject id from slot text — handles "Subject → topic", "Subject — topic",
// "Algo + DS → ...", "Full revision — ...", "Mixed PYQs — ..." etc.
function subjectFromText(text) {
  if (!text) return null;
  // grab everything before → or — as the prefix
  const prefix = text.split(/[→—]/)[0].trim().toLowerCase();
  for (const [key, id] of PREFIX_MAP) {
    if (prefix === key || prefix.startsWith(key + ' ') || prefix.startsWith(key + '+')) {
      return id; // null means "skip this — multi-subject day"
    }
  }
  return null;
}

// Return ordered unique subject ids from slot1 (main) AND slot3 (secondary) across the month
function dominantSubjects(days) {
  const seenMain = new Set();
  const seenSecondary = new Set();
  const main = [];
  const secondary = [];
  for (const date of Object.keys(days).sort()) {
    const s1 = subjectFromText(days[date].slot1);
    if (s1 && !seenMain.has(s1)) { seenMain.add(s1); main.push(s1); }
    const s3 = subjectFromText(days[date].slot3);
    if (s3 && !seenSecondary.has(s3)) { seenSecondary.add(s3); secondary.push(s3); }
  }
  // secondary only if not already in main
  const extra = secondary.filter(id => !seenMain.has(id));
  return { main, secondary: extra };
}

// Count filled slots in a day
function filledSlots(daySlots) {
  return SLOTS.filter(sl => (daySlots[sl.id] || '').trim()).length;
}

const PHASE_COLORS = {
  '2026-03': '#a855f7',
  '2026-04': '#6366f1',
  '2026-05': '#ec4899',
  '2026-06': '#8b5cf6',
  '2026-07': '#3b82f6',
  '2026-08': '#f97316',
};

// ── sub-components ────────────────────────────────────────────────────────────

function SubjectPill({ subjectId }) {
  const s = SUBJECTS.find(x => x.id === subjectId);
  if (!s) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: s.color + '22', color: s.color, border: `1px solid ${s.color}44`,
    }}>
      {s.name}
    </span>
  );
}

function DayRow({ date, daySlots, logs, isToday, isPast }) {
  const [open, setOpen] = useState(false);
  const filled = filledSlots(daySlots);
  const completedCount = SLOTS.filter(sl => logs?.[sl.id]?.completed).length;
  const hasLog = SLOTS.some(sl => logs?.[sl.id]?.hoursStudied > 0 || logs?.[sl.id]?.completed);
  const dayLabel = format(new Date(date + 'T12:00:00'), 'EEE d');

  const statusColor = isPast
    ? (completedCount > 0 ? 'var(--green)' : 'var(--red)')
    : isToday ? 'var(--accent)' : 'var(--border)';

  return (
    <div style={{ borderLeft: `3px solid ${statusColor}`, marginBottom: 4, borderRadius: '0 8px 8px 0', overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
          background: isToday ? 'var(--accent-bg)' : 'var(--surface2)',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent2)' : 'var(--text2)', minWidth: 52 }}>
          {dayLabel}
        </span>
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 5, minWidth: 0 }}>
          {SLOTS.map(sl => {
            const text = (daySlots[sl.id] || '').trim();
            if (!text) return null;
            const done = logs?.[sl.id]?.completed;
            return (
              <span key={sl.id} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 5,
                background: done ? 'var(--green)22' : 'var(--surface3)',
                color: done ? 'var(--green)' : 'var(--muted)',
                border: `1px solid ${done ? 'var(--green)44' : 'var(--border)'}`,
                maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }} title={text}>
                {done ? '✓ ' : ''}{text}
              </span>
            );
          })}
          {filled === 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>No tasks</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {hasLog && (
            <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>
              {completedCount}/{filled} ✓
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div style={{ background: 'var(--surface)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SLOTS.map(sl => {
            const text = (daySlots[sl.id] || '').trim();
            const log = logs?.[sl.id];
            return (
              <div key={sl.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 110, paddingTop: 1 }}>{sl.label}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: text ? 'var(--text)' : 'var(--muted)' }}>
                    {text || '—'}
                  </span>
                  {log && (log.hoursStudied > 0 || log.questions > 0 || log.completed) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {log.completed && <span className="badge badge-done">✓ Done</span>}
                      {log.hoursStudied > 0 && <span className="tag">{log.hoursStudied.toFixed(1)}h</span>}
                      {log.questions > 0 && <span className="tag">{log.questions} Q</span>}
                      {log.notes && <span className="tag">📝 {log.notes.slice(0, 40)}{log.notes.length > 40 ? '…' : ''}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MonthCard({ monthKey, days, logs, isCurrentMonth }) {
  const [expanded, setExpanded] = useState(isCurrentMonth);
  const today = todayStr();
  const monthDate = new Date(monthKey + '-01T12:00:00');
  const monthName = format(monthDate, 'MMMM yyyy');
  const color = PHASE_COLORS[monthKey] || 'var(--accent)';

  const allDates = Object.keys(days).sort();
  const totalDays = allDates.length;
  const totalSlots = allDates.reduce((sum, d) => sum + filledSlots(days[d]), 0);
  const completedSlots = allDates.reduce((sum, d) =>
    sum + SLOTS.filter(sl => logs?.[d]?.[sl.id]?.completed).length, 0);
  const studiedDays = allDates.filter(d => SLOTS.some(sl => logs?.[d]?.[sl.id]?.completed || logs?.[d]?.[sl.id]?.hoursStudied > 0)).length;
  const totalHours = allDates.reduce((sum, d) =>
    sum + SLOTS.reduce((s2, sl) => s2 + (logs?.[d]?.[sl.id]?.hoursStudied || 0), 0), 0);
  const pct = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;
  const dominant = dominantSubjects(days);

  return (
    <div className="card" style={{ marginBottom: 16, borderTop: `3px solid ${color}` }}>
      {/* Month header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color }}>{monthName}</span>
            {isCurrentMonth && (
              <span style={{ fontSize: 10, fontWeight: 700, background: color + '22', color, padding: '2px 8px', borderRadius: 99, border: `1px solid ${color}44` }}>
                CURRENT
              </span>
            )}
          </div>
          {/* Subject pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
            {dominant.main.map(id => <SubjectPill key={id} subjectId={id} />)}
          </div>
          {dominant.secondary.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>+ side:</span>
              {dominant.secondary.map(id => (
                <span key={id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600,
                  background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)',
                  opacity: 0.8,
                }}>
                  {SUBJECTS.find(s => s.id === id)?.name}
                </span>
              ))}
            </div>
          )}
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Days', value: totalDays },
              { label: 'Total Slots', value: totalSlots },
              { label: 'Done', value: `${completedSlots}/${totalSlots}` },
              { label: 'Studied Days', value: `${studiedDays}/${totalDays}` },
              { label: 'Hours Logged', value: `${totalHours.toFixed(1)}h` },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{value}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Progress ring */}
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <svg width={72} height={72} viewBox="0 0 72 72">
            <circle cx={36} cy={36} r={28} fill="none" stroke="var(--surface2)" strokeWidth={7} />
            <circle cx={36} cy={36} r={28} fill="none" stroke={color} strokeWidth={7}
              strokeDasharray={`${(pct / 100) * 2 * Math.PI * 28} ${2 * Math.PI * 28}`}
              strokeLinecap="round" transform="rotate(-90 36 36)"
              style={{ transition: 'stroke-dasharray 0.6s' }} />
            <text x={36} y={40} textAnchor="middle" fill="var(--text)" fontSize={13} fontWeight={800}>{pct}%</text>
          </svg>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>complete</div>
        </div>
        <span style={{ fontSize: 16, color: 'var(--muted)', marginLeft: 4 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar" style={{ marginTop: 12, height: 5 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>

      {/* Day rows */}
      {expanded && (
        <div style={{ marginTop: 14 }}>
          {allDates.map(date => (
            <DayRow
              key={date}
              date={date}
              daySlots={days[date]}
              logs={logs?.[date]}
              isToday={date === today}
              isPast={date < today}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function Roadmap() {
  const dailyLogs = useStore(s => s.dailyLogs);
  const today = todayStr();
  const currentMonth = today.slice(0, 7);

  const byMonth = groupByMonth(DAILY_PLAN);
  const monthKeys = Object.keys(byMonth).sort();

  // Overall stats
  const allDates = Object.keys(DAILY_PLAN);
  const totalSlots = allDates.reduce((sum, d) => sum + filledSlots(DAILY_PLAN[d]), 0);
  const completedSlots = allDates.reduce((sum, d) =>
    sum + SLOTS.filter(sl => dailyLogs?.[d]?.[sl.id]?.completed).length, 0);
  const totalHours = Object.values(dailyLogs).reduce((sum, dayLog) =>
    sum + SLOTS.reduce((s2, sl) => s2 + (dayLog?.[sl.id]?.hoursStudied || 0), 0), 0);
  const overallPct = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>📅 Study Roadmap</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
          Full GO Classes curriculum — month by month, slot by slot
        </div>
      </div>

      {/* Overall summary bar */}
      <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Overall Progress</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent2)', lineHeight: 1 }}>{overallPct}%</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{completedSlots} of {totalSlots} slots completed</div>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Months', value: monthKeys.length, color: 'var(--accent)' },
              { label: 'Total Days', value: allDates.length, color: 'var(--accent2)' },
              { label: 'Total Slots', value: totalSlots, color: 'var(--green)' },
              { label: 'Hours Logged', value: `${totalHours.toFixed(0)}h`, color: 'var(--yellow)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="progress-bar" style={{ marginTop: 16, height: 8 }}>
          <div className="progress-fill" style={{ width: `${overallPct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }} />
        </div>
      </div>

      {/* Subject legend */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>GO Classes Subject Order</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUBJECTS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, minWidth: 16 }}>{i + 1}.</span>
              <SubjectPill subjectId={s.id} />
            </div>
          ))}
        </div>
      </div>

      {/* Month cards */}
      {monthKeys.map(mk => (
        <MonthCard
          key={mk}
          monthKey={mk}
          days={byMonth[mk]}
          logs={Object.fromEntries(
            Object.keys(byMonth[mk]).map(d => [d, dailyLogs[d]])
          )}
          isCurrentMonth={mk === currentMonth}
        />
      ))}
    </div>
  );
}
