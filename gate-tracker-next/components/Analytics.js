'use client';
import React, { useState } from 'react';
import useStore from '@/store/useStore';
import { SUBJECTS } from '@/data/subjects';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';

const MONTHS = ['This Month', 'Last Month', 'All Time'];

export default function Analytics() {
  const { dailyHours, topicStats, subjectStats, streak, weeklyTarget } = useStore();
  const [period, setPeriod] = useState('This Month');

  const now = new Date();
  const monthStart = period === 'Last Month' ? startOfMonth(subMonths(now, 1)) : startOfMonth(now);
  const monthEnd = period === 'Last Month' ? endOfMonth(subMonths(now, 1)) : endOfMonth(now);

  // Daily hours chart
  const days = period === 'All Time'
    ? Object.keys(dailyHours).sort().map(d => ({ date: d, hours: dailyHours[d] }))
    : eachDayOfInterval({ start: monthStart, end: monthEnd }).map(d => {
        const ds = format(d, 'yyyy-MM-dd');
        return { date: format(d, 'MMM d'), hours: dailyHours[ds] || 0 };
      });

  // Subject hours pie
  const subjectPie = SUBJECTS.map(s => ({
    name: s.name,
    value: +(subjectStats[s.id]?.hoursSpent || 0).toFixed(1),
    color: s.color,
  })).filter(s => s.value > 0);

  // Subject questions bar
  const subjectQBar = SUBJECTS.map(s => {
    const ts = s.topics.map(t => topicStats[t.id] || {});
    const pyq = ts.reduce((sum, t) => sum + (t.pyqSolved || 0), 0);
    const practice = ts.reduce((sum, t) => sum + (t.practiceSolved || 0), 0);
    return { name: s.name.slice(0, 8), pyq, practice };
  });

  // Total stats
  const totalHours = Object.values(dailyHours).reduce((a, b) => a + b, 0);
  const totalQ = Object.values(topicStats).reduce((sum, t) => sum + (t.pyqSolved || 0) + (t.practiceSolved || 0), 0);
  const totalDone = Object.values(topicStats).filter(t => t.done).length;
  const totalTopics = Object.keys(topicStats).length;

  // Weakest subject
  const weakest = SUBJECTS.map(s => {
    const ts = s.topics.map(t => topicStats[t.id] || {});
    const solved = ts.reduce((sum, t) => sum + (t.pyqSolved || 0) + (t.practiceSolved || 0), 0);
    const correct = ts.reduce((sum, t) => sum + (t.pyqCorrect || 0) + (t.practiceCorrect || 0), 0);
    return { name: s.name, color: s.color, acc: solved > 0 ? Math.round((correct / solved) * 100) : 100 };
  }).sort((a, b) => a.acc - b.acc)[0];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Analytics</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {MONTHS.map(m => (
            <button key={m} className={`btn btn-sm ${period === m ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPeriod(m)}>{m}</button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Hours', value: `${totalHours.toFixed(1)}h` },
          { label: 'Questions Solved', value: totalQ },
          { label: 'Topics Completed', value: `${totalDone}/${totalTopics}` },
          { label: 'Current Streak', value: `${streak.current} days` },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent2)' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {weakest && weakest.acc < 80 && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--red)11', borderColor: 'var(--red)44' }}>
          <span style={{ color: 'var(--red)', fontWeight: 600 }}>Weakest Subject: </span>
          <span style={{ color: weakest.color }}>{weakest.name}</span>
          <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{weakest.acc}% accuracy — needs more attention</span>
        </div>
      )}

      {/* Daily hours chart */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 14 }}>Daily Study Hours</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={days.slice(-30)}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8892b0' }} interval={Math.floor(days.length / 10)} />
            <YAxis tick={{ fontSize: 10, fill: '#8892b0' }} />
            <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2e3250', borderRadius: 8 }} />
            <Bar dataKey="hours" fill="var(--accent)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Subject hours pie */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 14 }}>Subject Hours Distribution</div>
          {subjectPie.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>No hours logged yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={subjectPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name.slice(0, 6)} ${value}h`} labelLine={false}>
                  {subjectPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2e3250', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Questions per subject */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 14 }}>Questions per Subject</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subjectQBar} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: '#8892b0' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#8892b0' }} width={60} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2e3250', borderRadius: 8 }} />
              <Bar dataKey="pyq" fill="var(--blue)" name="PYQ" stackId="a" />
              <Bar dataKey="practice" fill="var(--green)" name="Practice" stackId="a" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Streak heatmap */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 14 }}>Study Streak — {streak.current} days current · {streak.longest} days best</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {Array.from({ length: 90 }, (_, i) => {
            const d = format(new Date(Date.now() - (89 - i) * 86400000), 'yyyy-MM-dd');
            const h = dailyHours[d] || 0;
            const studied = streak.studiedDates?.includes(d);
            return (
              <div
                key={d}
                title={`${d}: ${h.toFixed(1)}h`}
                style={{
                  width: 12, height: 12, borderRadius: 2,
                  background: studied ? `rgba(99,102,241,${Math.min(1, 0.3 + h / 8)})` : 'var(--surface2)',
                }}
              />
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>Last 90 days</div>
      </div>
    </div>
  );
}

