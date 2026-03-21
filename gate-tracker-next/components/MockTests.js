'use client';
import React, { useState } from 'react';
import useStore from '@/store/useStore';
import { SUBJECTS } from '@/data/subjects';
import { FlaskConical, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function MockTests() {
  const { mockTests, addMockTest, deleteMockTest } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), score: '', total: 100, duration: 180, weakSubjects: [], notes: '' });

  const handleAdd = () => {
    if (!form.score) return;
    addMockTest({ ...form, score: +form.score, total: +form.total, duration: +form.duration });
    setForm({ date: format(new Date(), 'yyyy-MM-dd'), score: '', total: 100, duration: 180, weakSubjects: [], notes: '' });
    setShowForm(false);
  };

  const avg = mockTests.length > 0 ? Math.round(mockTests.reduce((s, t) => s + (t.score / t.total) * 100, 0) / mockTests.length) : 0;
  const best = mockTests.length > 0 ? Math.max(...mockTests.map(t => Math.round((t.score / t.total) * 100))) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Mock Tests</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          <Plus size={14} /> Add Mock Test
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent2)' }}>{mockTests.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Tests Taken</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>{best}%</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Best Score</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue)' }}>{avg}%</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Average Score</div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 14 }}>Log Mock Test</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Score</label>
              <input type="number" placeholder="Score" value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Total Marks</label>
              <input type="number" value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Duration (min)</label>
              <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Weak Subjects (select multiple)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUBJECTS.map(s => {
                const sel = form.weakSubjects.includes(s.id);
                return (
                  <button
                    key={s.id}
                    className={`btn btn-sm ${sel ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setForm(f => ({
                      ...f,
                      weakSubjects: sel ? f.weakSubjects.filter(x => x !== s.id) : [...f.weakSubjects, s.id],
                    }))}
                  >{s.name}</button>
                );
              })}
            </div>
          </div>
          <textarea
            placeholder="Notes / analysis"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2} style={{ width: '100%', marginTop: 10, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleAdd}>Save</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Test list */}
      {mockTests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          <FlaskConical size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <div>No mock tests yet. Start in August as per your plan.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...mockTests].reverse().map(test => {
            const pct = Math.round((test.score / test.total) * 100);
            return (
              <div key={test.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {test.score}/{test.total}
                      <span style={{ marginLeft: 10, fontSize: 18, fontWeight: 700, color: pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)' }}>{pct}%</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{test.date} · {test.duration} min</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div className="progress-bar" style={{ width: 100, marginTop: 6 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)' }} />
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red)' }}
                      onClick={() => deleteMockTest(test.id)}
                      title="Delete test"
                    ><Trash2 size={13} /></button>
                  </div>
                </div>
                {test.weakSubjects?.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Weak: </span>
                    {test.weakSubjects.map(sid => {
                      const s = SUBJECTS.find(x => x.id === sid);
                      return s ? <span key={sid} className="tag" style={{ color: s.color }}>{s.name}</span> : null;
                    })}
                  </div>
                )}
                {test.notes && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>{test.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

