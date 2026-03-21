'use client';
import { useState, useEffect, useRef } from 'react';
import useStore from '@/store/useStore';
import Dashboard from './Dashboard';
import DailyPlanner from './DailyPlanner';
import SubjectTracker from './SubjectTracker';
import Backlog from './Backlog';
import QuestionTracker from './QuestionTracker';
import Analytics from './Analytics';
import MockTests from './MockTests';
import FocusTimer from './FocusTimer';
import { LayoutDashboard, CalendarDays, BookOpen, AlertCircle, Target, BarChart2, FlaskConical, Timer, LogOut, Sun, Moon, Menu, X } from 'lucide-react';

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'planner',    label: 'Daily Planner', icon: CalendarDays },
  { id: 'focus',      label: 'Focus Timer',   icon: Timer },
  { id: 'subjects',   label: 'Subjects',      icon: BookOpen },
  { id: 'questions',  label: 'Questions',     icon: Target },
  { id: 'backlog',    label: 'Backlog',       icon: AlertCircle },
  { id: 'analytics',  label: 'Analytics',     icon: BarChart2 },
  { id: 'mocks',      label: 'Mock Tests',    icon: FlaskConical },
];

export default function AppShell() {
  const { activeTab, setActiveTab, username, logout, undoToast, clearUndoToast, undo } = useStore();
  const [theme, setTheme] = useState('dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('gate_theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  // Auto-dismiss undo toast after 5s
  useEffect(() => {
    if (!undoToast) return;
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => clearUndoToast(), 5000);
    return () => clearTimeout(toastTimer.current);
  }, [undoToast]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('gate_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const navigate = (id) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':  return <Dashboard />;
      case 'planner':    return <DailyPlanner />;
      case 'focus':      return <FocusTimer />;
      case 'subjects':   return <SubjectTracker />;
      case 'questions':  return <QuestionTracker />;
      case 'backlog':    return <Backlog />;
      case 'analytics':  return <Analytics />;
      case 'mocks':      return <MockTests />;
      default:           return <Dashboard />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent2)', letterSpacing: '-0.3px' }}>⚡ GATE CSE</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Study Operating System</div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ color: 'var(--muted)', padding: 4, display: 'none' }}
              className="hide-desktop"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  background: active ? 'var(--accent)' : 'transparent',
                  color: active ? '#fff' : 'var(--muted)',
                  transition: 'all 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; } }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 16px', borderTop: '1.5px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>👤 {username}</div>
            <button
              onClick={toggleTheme}
              style={{ padding: '6px', borderRadius: 8, background: 'var(--surface2)', color: 'var(--muted)', border: '1.5px solid var(--border)' }}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={logout}
          >
            <LogOut size={12} /> Logout
          </button>
          <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>Synced to MongoDB</div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content" style={{ flex: 1 }}>
        {/* Mobile header */}
        <div className="mobile-header">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ color: 'var(--text)', padding: 4 }}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent2)' }}>⚡ GATE CSE</div>
          <button
            onClick={toggleTheme}
            style={{ padding: '6px', borderRadius: 8, background: 'var(--surface2)', color: 'var(--muted)', border: '1.5px solid var(--border)' }}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>

        {renderTab()}
      </main>

      {/* Undo toast */}
      {undoToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface)', border: '1.5px solid var(--border)',
          borderRadius: 12, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: 'var(--shadow-lg)', zIndex: 9999,
          fontSize: 13, fontWeight: 500, color: 'var(--text)',
          animation: 'slideUp 0.2s ease',
          whiteSpace: 'nowrap',
        }}>
          <span>🗑 {undoToast.message}</span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { undo(); clearUndoToast(); }}
          >
            Undo
          </button>
          <button
            onClick={clearUndoToast}
            style={{ color: 'var(--muted)', padding: '2px 4px' }}
          >✕</button>
        </div>
      )}
    </div>
  );
}
