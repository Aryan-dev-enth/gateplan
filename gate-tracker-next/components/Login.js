'use client';
import { useState, useEffect } from 'react';
import useStore from '@/store/useStore';
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';

export default function Login() {
  const { login, register, loading } = useStore();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = localStorage.getItem('gate_theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('gate_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) return setError('All fields required.');
    if (mode === 'register') {
      if (password.length < 4) return setError('Password must be at least 4 characters.');
      if (password !== confirm) return setError('Passwords do not match.');
      const res = await register(username.trim(), password);
      if (res.error) setError(res.error);
    } else {
      const res = await login(username.trim(), password);
      if (res.error) setError(res.error);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 16 }}>
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{ position: 'fixed', top: 20, right: 20, padding: '8px', borderRadius: 10, background: 'var(--surface)', color: 'var(--muted)', border: '1.5px solid var(--border)', boxShadow: 'var(--shadow)' }}
        title="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>⚡</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent2)', letterSpacing: '-0.5px' }}>GATE CSE Tracker</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Your personal study operating system</div>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {/* Tab toggle */}
          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--muted)',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'login' ? 'Login' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Username</label>
              <input
                type="text" value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. aryan"
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', padding: 4 }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {mode === 'register' && (
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Confirm Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                />
              </div>
            )}
            {error && (
              <div style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red)12', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--red)30' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: 14, marginTop: 4 }}
              disabled={loading}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--muted)' }}>
          Data stored securely in MongoDB · works across devices
        </div>
      </div>
    </div>
  );
}
