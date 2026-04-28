"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Activity, Search, RefreshCw, LogIn, UserPlus, Server, Clock, User } from "lucide-react";

interface LogEntry {
  _id: string;
  username: string;
  action: string;
  timestamp: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn className="w-4 h-4 text-blue-500" />,
  register: <UserPlus className="w-4 h-4 text-green-500" />,
  dashboard_load: <RefreshCw className="w-4 h-4 text-orange-500" />
};

const ACTION_LABELS: Record<string, string> = {
  login: "User Login",
  register: "Account Created",
  dashboard_load: "Dashboard Load"
};

const ACTION_COLORS: Record<string, string> = {
  login: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  register: "bg-green-500/10 text-green-500 border-green-500/20",
  dashboard_load: "bg-orange-500/10 text-orange-500 border-orange-500/20"
};

export default function LogsClient() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.username.toLowerCase().includes(search.toLowerCase());
    const matchesAction = filterAction === "all" || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] py-10 px-4 sm:px-6 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 fade-in">
          <Link href="/dashboard" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
            <ChevronLeft className="w-3 h-3" /> Dashboard
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] flex items-center justify-center gap-2">
              <Activity className="w-6 h-6 text-[var(--accent)]" /> Activity Logs
            </h1>
            <p className="text-[10px] text-[var(--muted)] font-medium uppercase tracking-widest mt-1">Audit Trail & Analytics</p>
          </div>
          <button 
            onClick={fetchLogs}
            className="w-[80px] flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--accent)] transition-colors group"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-[var(--accent)]' : 'group-hover:rotate-180 transition-transform duration-500'}`} /> 
            Refresh
          </button>
        </header>

        {/* Filters */}
        <div className="bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 mb-8 shadow-sm backdrop-blur-xl fade-in-1">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
              {['all', 'login', 'register', 'dashboard_load'].map(action => (
                <button
                  key={action}
                  onClick={() => setFilterAction(action)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    filterAction === action
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md'
                      : 'bg-white dark:bg-slate-900/50 text-[var(--muted)] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  {action === 'all' ? 'All Activity' : ACTION_LABELS[action]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Logs Chat View */}
        <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl fade-in-2 h-[600px] flex flex-col backdrop-blur-md">
          {isLoading && logs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-800 border-t-[var(--accent)] rounded-full animate-spin mb-4" />
              <p className="text-sm font-bold text-[var(--muted)] animate-pulse">Connecting to chat...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
              <Server className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[var(--text)] mb-1">Room is quiet</h3>
              <p className="text-xs text-[var(--muted)] font-medium">No activity matches your current filters.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-0.5 font-sans text-[13px]">
              {filteredLogs.map((log) => {
                const date = new Date(log.timestamp);
                const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                // Deterministic color for username
                const TWITCH_COLORS = ["#FF0000", "#0000FF", "#008000", "#B22222", "#FF7F50", "#9ACD32", "#FF4500", "#2E8B57", "#DAA520", "#D2691E", "#5F9EA0", "#1E90FF", "#FF69B4", "#8A2BE2", "#00FF7F"];
                let hash = 0;
                for (let i = 0; i < log.username.length; i++) hash = log.username.charCodeAt(i) + ((hash << 5) - hash);
                const color = TWITCH_COLORS[Math.abs(hash) % TWITCH_COLORS.length];
                
                const isLogin = log.action === 'login';
                const message = log.action === 'login' ? 'logged in' : log.action === 'register' ? 'created an account' : log.action === 'dashboard_load' ? 'opened the dashboard' : log.action;

                return (
                  <div key={log._id} className="hover:bg-slate-100 dark:hover:bg-white/5 px-2 py-1 rounded transition-colors break-words leading-relaxed flex items-start gap-2">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap mt-0.5">{timeString}</span>
                    <div>
                      <span className="font-bold mr-1.5" style={{ color }}>{log.username}</span>
                      <span className={`${isLogin ? 'text-blue-500 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
                        {message}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
