"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ChevronLeft, Search, RefreshCw, Server, User, Users,
  History, Calendar, Globe, ChevronDown, ChevronRight
} from "lucide-react";
import { getCurrentUser } from "@/lib/store";
import { useSocket } from "@/lib/useSocket";

interface LogEntry {
  _id: string;
  username: string;
  action: string;
  timestamp: string;
}

const ACTION_LABELS: Record<string, string> = {
  login: "logged in",
  register: "created account",
  dashboard_load: "opened dashboard"
};

const ACTION_COLORS: Record<string, string> = {
  login: "text-blue-400",
  register: "text-emerald-400",
  dashboard_load: "text-amber-400"
};

const getUsernameColor = (username: string) => {
  const TWITCH_COLORS = ["#FF0000", "#0000FF", "#008000", "#B22222", "#FF7F50", "#9ACD32", "#FF4500", "#2E8B57", "#DAA520", "#D2691E", "#5F9EA0", "#1E90FF", "#FF69B4", "#8A2BE2", "#00FF7F"];
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return TWITCH_COLORS[Math.abs(hash) % TWITCH_COLORS.length];
};

export default function LogsClient() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  const currentUser = getCurrentUser();
  const { onlineUsers } = useSocket(currentUser);

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
    const interval = setInterval(fetchLogs, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.username.toLowerCase().includes(search.toLowerCase());
    const matchesAction = filterAction === "all" || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const groupedLogs: { date: string, entries: LogEntry[][] }[] = [];
  let currentDate = "";
  let lastUser = "";

  filteredLogs.forEach(log => {
    const dateStr = new Date(log.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      groupedLogs.push({ date: dateStr, entries: [] });
      lastUser = "";
    }
    const currentDayGroup = groupedLogs[groupedLogs.length - 1];
    if (log.username === lastUser) {
      currentDayGroup.entries[currentDayGroup.entries.length - 1].push(log);
    } else {
      currentDayGroup.entries.push([log]);
      lastUser = log.username;
    }
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] py-8 px-4 sm:px-8 selection:bg-[var(--accent)]/30 selection:text-white font-medium">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-end justify-between gap-6 mb-12 fade-in">
          <div className="flex flex-col gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-white transition-all group w-fit">
              <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Dashboard
            </Link>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <Globe className="w-6 h-6 text-[var(--accent)]" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white leading-none">Activity</h1>
                <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-[0.2em] opacity-50 mt-1">Real-time hub</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest mb-0.5">Online</span>
              <span className="text-2xl font-black tabular-nums text-white leading-none">{onlineUsers.length}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex -space-x-2">
              {onlineUsers.slice(0, 3).map((u, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[var(--bg)] bg-white/10 flex items-center justify-center font-bold text-[10px] shadow-xl" style={{ color: getUsernameColor(u.username) }}>
                  {u.username.charAt(0).toUpperCase()}
                </div>
              ))}
              {onlineUsers.length > 3 && (
                <div className="w-8 h-8 rounded-full border-2 border-[var(--bg)] bg-white/5 flex items-center justify-center font-bold text-[8px] text-[var(--muted)] backdrop-blur-sm">
                  +{onlineUsers.length - 3}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-220px)]">
          {/* Main Area */}
          <div className="lg:col-span-8 flex flex-col gap-6 overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-4 fade-in-1">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30 transition-all placeholder:text-[var(--muted)]/40"
                />
              </div>
              <div className="flex gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl">
                {['all', 'login', 'register'].map(action => (
                  <button
                    key={action}
                    onClick={() => setFilterAction(action)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                      filterAction === action
                        ? 'bg-white/10 text-white'
                        : 'text-[var(--muted)] hover:text-white'
                    }`}
                  >
                    {action === 'all' ? 'All' : ACTION_LABELS[action] || action}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto glass-minimal p-1 custom-scrollbar fade-in-2">
              <div className="p-4 space-y-8">
                {isLoading && logs.length === 0 ? (
                  <div className="py-10 flex flex-col items-center opacity-30">
                    <RefreshCw className="w-8 h-8 mb-3 animate-spin" />
                    <p className="text-[9px] font-bold uppercase tracking-widest">Syncing...</p>
                  </div>
                ) : (
                  groupedLogs.map((group) => (
                    <div key={group.date}>
                      <div className="sticky top-0 z-10 py-3 mb-6 flex items-center gap-4 bg-[var(--bg)]/80 backdrop-blur-xl">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--muted)] opacity-50">{group.date}</h3>
                        <div className="flex-1 h-px bg-white/5"></div>
                      </div>

                      <div className="space-y-6 ml-1">
                        {group.entries.map((userLogs, uIdx) => {
                          const groupId = `${group.date}-${userLogs[0].username}-${uIdx}`;
                          const isExpanded = expandedGroups[groupId];
                          return (
                            <div key={uIdx} className="group/user flex gap-6">
                              <div className="flex flex-col items-center">
                                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-sm transition-all" style={{ color: getUsernameColor(userLogs[0].username) }}>
                                  {userLogs[0].username.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 w-px bg-white/5 mt-3 group-last/user:hidden" />
                              </div>
                              
                              <div className="flex-1 flex flex-col gap-2">
                                <button 
                                  onClick={() => toggleGroup(groupId)}
                                  className="flex items-center justify-between w-full hover:bg-white/[0.03] p-2 rounded-xl transition-all text-left"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">{userLogs[0].username}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] opacity-50">
                                      {userLogs.length} action{userLogs.length > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <ChevronDown className={`w-4 h-4 transition-all ${isExpanded ? 'rotate-180 text-[var(--accent)]' : 'text-[var(--muted)] opacity-30'}`} />
                                </button>

                                {isExpanded && (
                                  <div className="space-y-2.5 px-2 py-1 fade-in">
                                    {userLogs.map((log) => (
                                      <div key={log._id} className="flex items-center gap-5">
                                        <span className="text-[9px] font-medium text-[var(--muted)] tabular-nums opacity-40 w-12">
                                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <div className={`w-1 h-1 rounded-full ${log.action === 'login' ? 'bg-blue-400' : log.action === 'register' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                          <span className={`text-[11px] font-semibold tracking-wide ${ACTION_COLORS[log.action] || 'text-white'}`}>
                                            {ACTION_LABELS[log.action] || log.action}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6 overflow-hidden fade-in-3">
            <div className="glass-premium p-6 flex flex-col h-full overflow-hidden border-none bg-white/[0.02]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--muted)] opacity-50">Members</h3>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              </div>

              <div className="flex-1 overflow-y-auto space-y-5 custom-scrollbar pr-2">
                {onlineUsers.map((user) => (
                  <div key={user.username} className="flex items-center justify-between group/user-card">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs" style={{ color: getUsernameColor(user.username) }}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{user.username}</span>
                        <span className="text-[9px] text-[var(--muted)] font-medium uppercase tracking-widest opacity-40">
                          {user.sessionDuration}m active
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="w-1 h-1 bg-green-500 rounded-full" />
                      <span className="text-[8px] text-[var(--muted)] font-medium tabular-nums mt-1 opacity-30">
                        {Math.floor((Date.now() - user.lastSeen) / 1000)}s
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .glass-minimal {
          background: rgba(255, 255, 255, 0.01);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 1.5rem;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
}
