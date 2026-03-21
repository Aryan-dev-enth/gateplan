'use client';
import React, { useState } from 'react';
import useStore from '@/store/useStore';
import { SUBJECTS } from '@/data/subjects';
import { format } from 'date-fns';
import { Target, TrendingDown, Trash2 } from 'lucide-react';

export default function QuestionTracker() {
  const { topicStats, practiceLog, addPracticeEntry, deletePracticeEntry } = useStore();
  const [form, setForm] = useState({ subjectId: '', topicId: '', type: 'pyq', solved: '', correct: '', note: '' });

  const handleAdd = () => {
    if (!form.topicId || !form.solved) return;
    addPracticeEntry({ ...form, solved: +form.solved, correct: +form.correct || 0 });
    setForm(f => ({ ...f, solved: '', correct: '', note: '' }));
  };

  const topics = form.subjectId ? SUBJECTS.find(s => s.id === form.subjectId)?.topics || [] : [];

  // Weak topics: accuracy < 60%
  const weakTopics = SUBJECTS.flatMap(s =>
    s.topics.map(t => {
      const ts = topicStats[t.id] || {};
      const solved = (ts.pyqSolved || 0) + (ts.practiceSolved || 0);
      const correct = (ts.pyqCorrect || 0) + (ts.practiceCorrect || 0);
      const acc = solved > 0 ? Math.round((correct / solved) * 100) : null;
      return { ...t, subjectName: s.name, subjectColor: s.color, solved, correct, acc };
    })
  ).filter(t => t.acc !== null && t.acc < 60).sort((a, b) => a.acc - b.acc);

  // Today's log
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayEntries = practiceLog[todayStr] || [];
  // All-time totals
  const allEntries = Object.values(practiceLog).flat();
  const totalPYQ = allEntries.filter(e => e.type === 'pyq').reduce((s, e) => s + e.solved, 0);
  const totalPractice = allEntries.filter(e => e.type === 'practice').reduce((s, e) => s + e.solved, 0);
  const totalCorrect = allEntries.reduce((s, e) => s + e.correct, 0);
  const totalSolved = allEntries.reduce((s, e) => s + e.solved, 0);
  const overallAcc = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Question Practice Tracker</h1>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Solved', value: totalSolved, color: 'var(--accent)' },
          { label: 'PYQs', value: totalPYQ, color: 'var(--blue)' },
          { label: 'Practice', value: totalPractice, color: 'var(--green)' },
          { label: 'Overall Accuracy', value: `${overallAcc}%`, color: overallAcc >= 70 ? 'var(--green)' : overallAcc >= 50 ? 'var(--yellow)' : 'var(--red)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Log form */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 14 }}>Log Questions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value, topicId: '' }))} style={{ width: '100%' }}>
              <option value="">Select Subject</option>
              {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={form.topicId} onChange={e => setForm(f => ({ ...f, topicId: e.target.value }))} style={{ width: '100%' }} disabled={!form.subjectId}>
              <option value="">Select Topic</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ flex: 1 }}>
                <option value="pyq">PYQ</option>
                <option value="practice">Practice</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min={0} placeholder="Questions solved" value={form.solved} onChange={e => setForm(f => ({ ...f, solved: e.target.value }))} style={{ flex: 1 }} />
              <input type="number" min={0} placeholder="Correct" value={form.correct} onChange={e => setForm(f => ({ ...f, correct: e.target.value }))} style={{ flex: 1 }} />
            </div>
            <input placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ width: '100%' }} />
            <button className="btn btn-primary" onClick={handleAdd} disabled={!form.topicId || !form.solved}>
              <Target size={14} /> Log Questions
            </button>
          </div>

          {/* Today's entries */}
          {todayEntries.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Today's Log</div>
              {todayEntries.map(e => {
                const topic = SUBJECTS.flatMap(s => s.topics).find(t => t.id === e.topicId);
                const acc = e.solved > 0 ? Math.round((e.correct / e.solved) * 100) : 0;
                return (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span>{topic?.name || e.topicId}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: 'var(--muted)' }}>{e.type.toUpperCase()} · {e.solved} Q · <span style={{ color: acc >= 70 ? 'var(--green)' : 'var(--yellow)' }}>{acc}%</span></span>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--red)', padding: '2px 6px' }}
                        onClick={() => deletePracticeEntry(todayStr, e.id)}
                        title="Delete entry"
                      ><Trash2 size={11} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weak topics */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
            <TrendingDown size={16} color="var(--red)" /> Weak Topics (accuracy &lt; 60%)
          </div>
          {weakTopics.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>No weak topics yet. Keep solving!</div>
          ) : (
            weakTopics.map(t => (
              <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 13 }}>{t.name}</span>
                    <span style={{ fontSize: 11, color: t.subjectColor, marginLeft: 8 }}>{t.subjectName}</span>
                  </div>
                  <span style={{ color: t.acc < 40 ? 'var(--red)' : 'var(--yellow)', fontWeight: 600, fontSize: 13 }}>{t.acc}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${t.acc}%`, background: t.acc < 40 ? 'var(--red)' : 'var(--yellow)' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{t.solved} solved · {t.correct} correct</div>
              </div>
            ))
          )}

          {/* Per-subject accuracy */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Subject Accuracy</div>
            {SUBJECTS.map(s => {
              const ts = s.topics.map(t => topicStats[t.id] || {});
              const solved = ts.reduce((sum, t) => sum + (t.pyqSolved || 0) + (t.practiceSolved || 0), 0);
              const correct = ts.reduce((sum, t) => sum + (t.pyqCorrect || 0) + (t.practiceCorrect || 0), 0);
              const acc = solved > 0 ? Math.round((correct / solved) * 100) : null;
              if (acc === null) return null;
              return (
                <div key={s.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: s.color }}>{s.name}</span>
                    <span style={{ color: acc >= 70 ? 'var(--green)' : acc >= 50 ? 'var(--yellow)' : 'var(--red)' }}>{acc}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${acc}%`, background: acc >= 70 ? 'var(--green)' : acc >= 50 ? 'var(--yellow)' : 'var(--red)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

