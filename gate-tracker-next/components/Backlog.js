'use client';
import { useState } from 'react';
import useStore from '@/store/useStore';
import { Trash2, Calendar, AlertTriangle, X, ArrowRight } from 'lucide-react';

const PRIORITIES = ['High', 'Medium', 'Low'];

function RescheduleModal({ item, onClose }) {
  const { rescheduleBacklogSmart, rescheduleBacklog } = useStore();
  const [mode, setMode] = useState(null);       // 'fit' | 'extend' | 'custom'
  const [customDate, setCustomDate] = useState('');
  const [result, setResult] = useState(null);

  const confirm = () => {
    if (mode === 'custom') {
      if (!customDate) return;
      rescheduleBacklog(item.id, customDate);
      setResult(customDate);
    } else {
      const d = rescheduleBacklogSmart(item.id, mode);
      setResult(d);
    }
  };

  if (result) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(4px)' }}>
        <div className="card" style={{ maxWidth: 380, width: '100%', padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Rescheduled</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
            "<span style={{ color: 'var(--text)' }}>{item.task}</span>" moved to <span style={{ color: 'var(--accent2)', fontWeight: 600 }}>{result}</span>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(4px)' }}>
      <div className="card" style={{ maxWidth: 420, width: '100%', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Reschedule Task</div>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>

        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, borderLeft: '3px solid var(--accent)' }}>
          {item.task}
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Originally: {item.date}</div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, fontWeight: 600 }}>How do you want to fit this in?</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {/* Option 1: Fit into current schedule */}
          <button
            onClick={() => setMode('fit')}
            style={{
              padding: '14px 16px', borderRadius: 10, textAlign: 'left',
              border: `2px solid ${mode === 'fit' ? 'var(--accent)' : 'var(--border)'}`,
              background: mode === 'fit' ? 'var(--accent-bg)' : 'var(--surface2)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, color: mode === 'fit' ? 'var(--accent2)' : 'var(--text)', marginBottom: 3 }}>
              📅 Fit into current schedule
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Squeeze into the nearest upcoming day that has room (max 2 extra tasks/day)
            </div>
          </button>

          {/* Option 2: Add a day at the end */}
          <button
            onClick={() => setMode('extend')}
            style={{
              padding: '14px 16px', borderRadius: 10, textAlign: 'left',
              border: `2px solid ${mode === 'extend' ? 'var(--accent)' : 'var(--border)'}`,
              background: mode === 'extend' ? 'var(--accent-bg)' : 'var(--surface2)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, color: mode === 'extend' ? 'var(--accent2)' : 'var(--text)', marginBottom: 3 }}>
              ➕ Add a day at the end
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Push to the day after your last planned date — keeps current schedule intact
            </div>
          </button>

          {/* Option 3: Pick a date */}
          <button
            onClick={() => setMode('custom')}
            style={{
              padding: '14px 16px', borderRadius: 10, textAlign: 'left',
              border: `2px solid ${mode === 'custom' ? 'var(--accent)' : 'var(--border)'}`,
              background: mode === 'custom' ? 'var(--accent-bg)' : 'var(--surface2)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, color: mode === 'custom' ? 'var(--accent2)' : 'var(--text)', marginBottom: 3 }}>
              🗓 Pick a specific date
            </div>
            {mode === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ marginTop: 8, width: '100%' }}
                autoFocus
              />
            )}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={!mode || (mode === 'custom' && !customDate)}
            onClick={confirm}
          >
            <ArrowRight size={14} /> Confirm
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function Backlog() {
  const { backlog, updateBacklogPriority, resolveBacklog } = useStore();
  const [filter, setFilter] = useState('All');
  const [rescheduleItem, setRescheduleItem] = useState(null);

  const filtered = filter === 'All' ? backlog : backlog.filter(b => b.priority === filter);

  // Sort by original plan order (order field = sequential index from plan)
  const sorted = [...filtered].sort((a, b) => {
    // Primary: priority
    const pOrder = { High: 0, Medium: 1, Low: 2 };
    if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
    // Secondary: original plan order (topic 1 before topic 2)
    return (a.order ?? 0) - (b.order ?? 0);
  });

  const highCount = backlog.filter(b => b.priority === 'High').length;

  return (
    <div>
      {rescheduleItem && (
        <RescheduleModal item={rescheduleItem} onClose={() => setRescheduleItem(null)} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="section-title">Backlog</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Missed tasks in original plan order — complete earlier topics first
          </div>
        </div>
        {backlog.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            {highCount > 0 && <span className="badge badge-high">{highCount} high priority</span>}
            <span className="badge badge-pending">{backlog.length} total</span>
          </div>
        )}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['All', ...PRIORITIES].map(p => (
          <button key={p} className={`btn btn-sm ${filter === p ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(p)}>
            {p}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
          <AlertTriangle size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No backlog items</div>
          <div style={{ fontSize: 13 }}>You're on track. Keep it up!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((item, idx) => (
            <div key={item.id} className="card" style={{
              borderLeft: `3px solid ${item.priority === 'High' ? 'var(--red)' : item.priority === 'Medium' ? 'var(--yellow)' : 'var(--green)'}`,
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {/* Order badge */}
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, minWidth: 24, paddingTop: 2 }}>
                  #{idx + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.task}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>Originally: {item.date}</span>
                    {item.rescheduledTo
                      ? <span style={{ color: 'var(--accent2)' }}>→ Rescheduled: {item.rescheduledTo}</span>
                      : <span style={{ color: 'var(--yellow)' }}>⚠ Not yet rescheduled</span>
                    }
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <select
                    value={item.priority}
                    onChange={e => updateBacklogPriority(item.id, e.target.value)}
                    style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }}
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>

                  <button className="btn btn-ghost btn-sm" onClick={() => setRescheduleItem(item)}>
                    <Calendar size={12} /> Reschedule
                  </button>

                  <button className="btn btn-green btn-sm" onClick={() => resolveBacklog(item.id)}>
                    Done
                  </button>

                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)' }}
                    onClick={() => resolveBacklog(item.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
