'use client'
import React, { useState, useEffect } from 'react';
import useStore from '@/store/useStore';
import { SUBJECTS, SLOTS } from '@/data/subjects';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Play, Square, RotateCcw, CheckCircle, Clock, Trash2 } from 'lucide-react';

const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

function TimerDisplay({ slotId }) {
  const { timers, startTimer, stopTimer, resetTimer, getElapsed } = useStore();
  const [, setTick] = useState(0);
  const t = timers[slotId];
  const running = t?.running;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const elapsed = getElapsed(slotId);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: running ? 'var(--green)' : 'var(--text)', minWidth: 70 }}>
        {fmt(elapsed)}
      </span>
      {!running ? (
        <button className="btn btn-green btn-sm" onClick={() => startTimer(slotId)}><Play size={12} /> Start</button>
      ) : (
        <button className="btn btn-red btn-sm" onClick={() => stopTimer(slotId)}><Square size={12} /> Stop</button>
      )}
      <button className="btn btn-ghost btn-sm" onClick={() => resetTimer(slotId)}><RotateCcw size={12} /></button>
    </div>
  );
}

function SlotCard({ slot, date }) {
  const { dailyLogs, logSlot, markSlotComplete, unmarkSlotComplete, assignSlot, getElapsed, deleteSlotLog } = useStore();
  const log = dailyLogs[date]?.[slot.id] || {};
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ topic: log.topic || '', questions: log.questions || 0, notes: log.notes || '' });

  // Sync form when log changes (e.g. after DB fetch)
  useEffect(() => {
    setForm({ topic: log.topic || '', questions: log.questions || 0, notes: log.notes || '' });
  }, [log.topic, log.questions, log.notes]);

  const handleSave = () => {
    const elapsed = getElapsed(slot.id);
    const hours = elapsed / 3600000;
    // logSlot handles ALL accumulation — hours, topic hours, subject hours, daily hours
    logSlot(date, slot.id, {
      topic: form.topic,
      questions: +form.questions || 0,
      notes: form.notes,
      hoursStudied: hours,
    });
    setEditing(false);
  };

  const done = log.completed;

  return (
    <div className="card" style={{ marginBottom: 12, borderLeft: `3px solid ${done ? 'var(--green)' : 'var(--accent)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{slot.label}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}><Clock size={11} style={{ verticalAlign: 'middle' }} /> {slot.time}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {done && <span className="badge badge-done">✓ Done</span>}
          {done && (
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => unmarkSlotComplete(date, slot.id)}>
              Undo
            </button>
          )}
          {!done && (
            <button className="btn btn-ghost btn-sm" onClick={() => markSlotComplete(date, slot.id)}>
              <CheckCircle size={12} /> Mark Done
            </button>
          )}
        </div>
      </div>

      {/* Planned task */}
      <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: 13 }}>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>PLANNED: </span>
        {slot.planned || <span style={{ color: 'var(--muted)' }}>Nothing assigned</span>}
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: 8, fontSize: 11 }}
          onClick={() => {
            const val = prompt('Override planned task:', slot.planned);
            if (val !== null) assignSlot(date, slot.id, val);
          }}
        >Edit</button>
      </div>

      <TimerDisplay slotId={slot.id} />

      {/* Log form */}
      {editing ? (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <select value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} style={{ width: '100%' }}>
            <option value="">Select topic studied</option>
            {SUBJECTS.map(s => (
              <optgroup key={s.id} label={s.name}>
                {s.topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </optgroup>
            ))}
          </select>
          <input
            type="number" min={0} placeholder="Total questions solved this session"
            value={form.questions}
            onChange={e => setForm(f => ({ ...f, questions: +e.target.value }))}
            style={{ width: '100%' }}
          />
          <textarea
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2} style={{ width: '100%', resize: 'vertical' }}
          />
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Timer: {fmt(getElapsed(slot.id))} · Hours will accumulate into subject progress on save
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>Save & Sync Progress</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>+ Log Progress</button>
          {log.topic && <span className="tag">{SUBJECTS.flatMap(s => s.topics).find(t => t.id === log.topic)?.name}</span>}
          {log.hoursStudied > 0 && <span className="tag" style={{ color: 'var(--green)' }}>{log.hoursStudied.toFixed(1)}h</span>}
          {log.questions > 0 && <span className="tag">{log.questions} Q</span>}
          {log.notes && <span className="tag">📝</span>}
          {(log.topic || log.hoursStudied > 0 || log.questions > 0) && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--red)', marginLeft: 'auto' }}
              onClick={() => deleteSlotLog(date, slot.id)}
              title="Delete this log entry"
            >
              <Trash2 size={12} /> Delete Log
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function DailyPlanner() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { getPlannedSlots, dailyLogs } = useStore();
  const slots = getPlannedSlots(selectedDate);
  const log = dailyLogs[selectedDate] || {};
  const completed = slots.filter(s => log[s.id]?.completed).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Daily Planner</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}>
            <ChevronLeft size={14} />
          </button>
          <input
            type="date" value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ fontSize: 13 }}
          />
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}>
            <ChevronRight size={14} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}>Today</button>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>
          {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d yyyy')}
        </span>
        <span className="badge badge-done">{completed}/{slots.filter(s => s.planned).length} slots done</span>
      </div>

      <div style={{ maxWidth: 700 }}>
        {slots.map(slot => (
          <SlotCard key={slot.id} slot={slot} date={selectedDate} />
        ))}
      </div>
    </div>
  );
}

