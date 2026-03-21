'use client';
import React, { useState } from 'react';
import useStore from '@/store/useStore';
import { Trash2, Calendar, AlertTriangle } from 'lucide-react';

const PRIORITIES = ['High', 'Medium', 'Low'];

export default function Backlog() {
  const { backlog, updateBacklogPriority, rescheduleBacklog, resolveBacklog } = useStore();
  const [filter, setFilter] = useState('All');

  const filtered = filter === 'All' ? backlog : backlog.filter(b => b.priority === filter);
  const sorted = [...filtered].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.priority] - order[b.priority];
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Backlog</h1>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Incomplete tasks auto-detected from your plan</div>
        </div>
        {backlog.length > 0 && (
          <span className="badge badge-high" style={{ fontSize: 13 }}>{backlog.length} pending</span>
        )}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['All', ...PRIORITIES].map(p => (
          <button
            key={p}
            className={`btn btn-sm ${filter === p ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(p)}
          >{p}</button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          <AlertTriangle size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <div>No backlog items. You're crushing it!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map(item => (
            <div key={item.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{item.task}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Originally: {item.date}
                  {item.rescheduledTo && <span style={{ color: 'var(--accent2)', marginLeft: 8 }}>→ Rescheduled: {item.rescheduledTo}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <select
                  value={item.priority}
                  onChange={e => updateBacklogPriority(item.id, e.target.value)}
                  style={{ fontSize: 12, padding: '4px 8px' }}
                >
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    const d = prompt('Reschedule to (YYYY-MM-DD):', item.rescheduledTo || '');
                    if (d) rescheduleBacklog(item.id, d);
                  }}
                >
                  <Calendar size={12} /> Reschedule
                </button>

                <button
                  className="btn btn-green btn-sm"
                  onClick={() => resolveBacklog(item.id)}
                >Done</button>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => resolveBacklog(item.id)}
                  style={{ color: 'var(--red)' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

