'use client';
import React, { useState } from 'react';
import useStore from '@/store/useStore';
import { SUBJECTS } from '@/data/subjects';
import { CheckSquare, Square, ChevronDown, ChevronRight } from 'lucide-react';

function TopicRow({ topic, subjectId }) {
  const { topicStats, markTopicDone, logQuestions } = useStore();
  const stats = topicStats[topic.id] || {};
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState({ type: 'pyq', solved: '', correct: '' });

  const totalSolved = (stats.pyqSolved || 0) + (stats.practiceSolved || 0);
  const totalCorrect = (stats.pyqCorrect || 0) + (stats.practiceCorrect || 0);
  const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : null;

  const handleLog = () => {
    if (!form.solved) return;
    logQuestions(topic.id, form.type, +form.solved, +form.correct || 0);
    setForm({ type: 'pyq', solved: '', correct: '' });
    setShowLog(false);
  };

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => markTopicDone(topic.id, !stats.done)}
          style={{ background: 'none', color: stats.done ? 'var(--green)' : 'var(--muted)', flexShrink: 0 }}
        >
          {stats.done ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, textDecoration: stats.done ? 'line-through' : 'none', color: stats.done ? 'var(--muted)' : 'var(--text)' }}>
            {topic.name}
          </span>
          <span className="tag" style={{ marginLeft: 8, fontSize: 10 }}>{topic.subtopic}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)', alignItems: 'center' }}>
          {stats.hoursSpent > 0 && <span>{stats.hoursSpent.toFixed(1)}h</span>}
          {totalSolved > 0 && <span>{totalSolved} Q</span>}
          {accuracy !== null && (
            <span style={{ color: accuracy >= 70 ? 'var(--green)' : accuracy >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
              {accuracy}%
            </span>
          )}
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setShowLog(v => !v)}>
            + Log Q
          </button>
        </div>
      </div>
      {showLog && (
        <div style={{ marginTop: 8, marginLeft: 26, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: 100 }}>
            <option value="pyq">PYQ</option>
            <option value="practice">Practice</option>
          </select>
          <input type="number" min={0} placeholder="Solved" value={form.solved} onChange={e => setForm(f => ({ ...f, solved: e.target.value }))} style={{ width: 80 }} />
          <input type="number" min={0} placeholder="Correct" value={form.correct} onChange={e => setForm(f => ({ ...f, correct: e.target.value }))} style={{ width: 80 }} />
          <button className="btn btn-primary btn-sm" onClick={handleLog}>Save</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowLog(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function SubjectCard({ subject }) {
  const { topicStats, subjectStats } = useStore();
  const [open, setOpen] = useState(false);
  const stats = subjectStats[subject.id] || {};
  const done = subject.topics.filter(t => topicStats[t.id]?.done).length;
  const pct = Math.round((done / subject.topics.length) * 100);

  // Group by subtopic
  const groups = {};
  subject.topics.forEach(t => {
    if (!groups[t.subtopic]) groups[t.subtopic] = [];
    groups[t.subtopic].push(t);
  });

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        onClick={() => setOpen(v => !v)}
      >
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: subject.color, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{subject.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {done}/{subject.topics.length} topics · {stats.hoursSpent?.toFixed(1) || 0}h spent
          </div>
        </div>
        <div style={{ width: 120 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
            <span>{pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%`, background: subject.color }} />
          </div>
        </div>
        {open ? <ChevronDown size={16} color="var(--muted)" /> : <ChevronRight size={16} color="var(--muted)" />}
      </div>

      {open && (
        <div style={{ marginTop: 14 }}>
          {Object.entries(groups).map(([subtopic, topics]) => (
            <div key={subtopic} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: subject.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                {subtopic}
              </div>
              {topics.map(t => <TopicRow key={t.id} topic={t} subjectId={subject.id} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SubjectTracker() {
  const { topicStats } = useStore();
  const totalDone = Object.values(topicStats).filter(t => t.done).length;
  const total = Object.keys(topicStats).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Subject & Topic Tracker</h1>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>{totalDone}/{total} topics completed</span>
      </div>
      {SUBJECTS.map(s => <SubjectCard key={s.id} subject={s} />)}
    </div>
  );
}

