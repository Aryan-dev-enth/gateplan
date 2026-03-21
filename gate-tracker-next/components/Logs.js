'use client';
import { useState } from 'react';
import useStore from '@/store/useStore';
import { SUBJECTS } from '@/data/subjects';
import { format, subDays } from 'date-fns';
import { Trash2, Clock, BookOpen, Target, FlaskConical, Filter } from 'lucide-react';

const TOPIC_MAP = {};
SUBJECTS.forEach(s => s.topics.forEach(t => { TOPIC_MAP[t.id] = { name: t.name, subjectName: s.name, color: s.color }; }));

const fmtH = (h) => h > 0 ? `${h.toFixed(2)}h` : null;

export default function Logs() {
  const { dailyLogs, practiceLog, mockTests, deleteSlotLog, deletePracticeEntry, deleteMockTest, unmarkSlotComplete } = useStore();
  const [filter, setFilter] = useState('all'); // all | slots | questions | mocks
  const [days, setDays] = useState(30);

  // Build unified timeline
  const entries = [];
  const cutoff = format(subDays(new Date(), days), 'yyyy-MM-dd');

  // Slot logs
  if (filter === 'all' || filter === 'slots') {
    Object.entries(dailyLogs).forEach(([date, slots]) => {
      if (date < cutoff) return;
      Object.entries(slots).forEach(([slotId, log]) => {
        if (!log || (!log.topic && !log.hoursStudied && !log.questions && !log.completed)) return;
        entries.push({
          type: 'slot', date, slotId, log,
          sortKey: date + slotId,
          topic: TOPIC_MAP[log.topic],
        });
      });
    });
  }

  // Practice entries
  if (filter === 'all' || filter === 'questions') {
    Object.entries(practiceLog).forEach(([date, list]) => {
      if (date < cutoff) return;
      (list || []).forEach(e => {
        entries.push({
          type: 'practice', date, entry: e,
          sortKey: date + e.id,
          topic: TOPIC_MAP[e.topicId],
        });
      });
    });
  }

  // Mock tests
  if (filter === 'all' || filter === 'mocks') {
    mockTests.forEach(t => {
      if (t.date < cutoff) return;
      entries.push({ type: 'mock', date: t.date, test: t, sortKey: t.date + t.id });
    });
  }

  // Sort newest first
  entries.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  // Group by date
  const grouped = {};
  entries.forEach(e => {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const totalEntries = entries.length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="section-title">Activity Log</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{totalEntries} entries in the last {days} days</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Day range */}
          {[7, 30, 90].map(d => (
            <button key={d} className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDays(d)}>
              {d}d
            </button>
          ))}
          <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
          {/* Type filter */}
          {[
            { id: 'all', label: 'All' },
            { id: 'slots', label: '📚 Study' },
            { id: 'questions', label: '🎯 Questions' },
            { id: 'mocks', label: '🧪 Mocks' },
          ].map(f => (
            <button key={f.id} className={`btn btn-sm ${filter === f.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {sortedDates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div>No logs found. Start studying and your activity will appear here.</div>
        </div>
      ) : (
        sortedDates.map(date => (
          <div key={date} style={{ marginBottom: 28 }}>
            {/* Date header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text2)' }}>
                {format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d yyyy')}
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{grouped[date].length} entries</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grouped[date].map((e, i) => {
                if (e.type === 'slot') {
                  const { log, slotId, topic } = e;
                  const acc = log.questions > 0 ? null : null;
                  return (
                    <div key={i} className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${log.completed ? 'var(--green)' : 'var(--accent)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 20, flexShrink: 0 }}>📚</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {topic ? (
                                <span style={{ color: topic.color }}>{topic.name}</span>
                              ) : (
                                <span style={{ color: 'var(--muted)' }}>Untagged slot</span>
                              )}
                              {topic && <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 8 }}>{topic.subjectName}</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                              Slot: {slotId.replace(/_/g, ' ')}
                            </div>
                            {log.notes && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, fontStyle: 'italic' }}>"{log.notes}"</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {log.completed && <span className="badge badge-done">✓ Done</span>}
                          {log.hoursStudied > 0 && <span className="badge badge-pending">{fmtH(log.hoursStudied)}</span>}
                          {log.questions > 0 && <span className="badge" style={{ background: 'var(--blue)20', color: 'var(--blue)' }}>{log.questions}Q</span>}
                          {log.completed && (
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => unmarkSlotComplete(date, slotId)}>
                              Undo done
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--red)' }}
                            onClick={() => deleteSlotLog(date, slotId)}
                            title="Delete log"
                          ><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (e.type === 'practice') {
                  const { entry, topic } = e;
                  const acc = entry.solved > 0 ? Math.round((entry.correct / entry.solved) * 100) : 0;
                  return (
                    <div key={i} className="card" style={{ padding: '14px 16px', borderLeft: '3px solid var(--blue)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 20, flexShrink: 0 }}>🎯</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {topic ? <span style={{ color: topic.color }}>{topic.name}</span> : entry.topicId}
                              {topic && <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 8 }}>{topic.subjectName}</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                              {entry.type?.toUpperCase()} · {entry.solved} solved · {entry.correct} correct
                            </div>
                            {entry.note && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, fontStyle: 'italic' }}>"{entry.note}"</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: acc >= 70 ? 'var(--green)' : acc >= 50 ? 'var(--yellow)' : 'var(--red)' }}>{acc}%</span>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--red)' }}
                            onClick={() => deletePracticeEntry(date, entry.id)}
                            title="Delete entry"
                          ><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (e.type === 'mock') {
                  const { test } = e;
                  const pct = Math.round((test.score / test.total) * 100);
                  return (
                    <div key={i} className="card" style={{ padding: '14px 16px', borderLeft: '3px solid var(--yellow)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                          <div style={{ fontSize: 20 }}>🧪</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>Mock Test — {test.score}/{test.total}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{test.duration} min</div>
                            {test.notes && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, fontStyle: 'italic' }}>"{test.notes}"</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)' }}>{pct}%</span>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--red)' }}
                            onClick={() => deleteMockTest(test.id)}
                            title="Delete test"
                          ><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
