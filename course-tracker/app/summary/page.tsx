"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Brain, Moon, Zap, Activity, Info, Sparkles, Flame, Apple, Clock, Target, RefreshCw, BookOpen } from "lucide-react";
import { getCurrentUser, getUser, DailySummary, getPerformancePrediction, getAiWellnessInsight, StudySession } from "@/lib/store";
import SummaryCalendar from "@/components/SummaryCalendar";

export default function SummaryPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [manualLectureRefs, setManualLectureRefs] = useState<Record<string, number | false>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [efficiency, setEfficiency] = useState(0);
  const [aiRemark, setAiRemark] = useState("");
  const [aiTimestamp, setAiTimestamp] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace("/"); return; }
    setUsername(u);

    // Load user data to get summaries
    getUser(u).then((data) => {
      setSummaries(data.dailySummaries || []);
      setStudySessions(data.studySessions || []);
      setManualLectureRefs(data.manualLectureRefs || {});
      
      const last7Days = data.dailySummaries?.slice(-7) || [];
      const actualHours = last7Days.reduce((sum, s) => sum + s.studyHours, 0);
      const plannedHours = 42; 
      setEfficiency(Math.round((actualHours / plannedHours) * 100));
      
      setIsLoading(false);
      
      // Initialize AI Remark from cached data
      if (data.lastAiWellnessRemark?.content) {
        setAiRemark(data.lastAiWellnessRemark.content);
        if (data.lastAiWellnessRemark.timestamp) {
          setAiTimestamp(new Date(data.lastAiWellnessRemark.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        }
      }
    });
  }, [router]);

  const fetchRemark = async (u: string, force = false) => {
    setIsAiLoading(true);
    const res = await fetch("/api/ai/wellness-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, forceRefresh: force }),
    });
    const data = await res.json();
    if (data.remark) {
      setAiRemark(data.remark);
      setAiTimestamp(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    } else {
      setAiRemark(data.error || "Could not generate insight.");
    }
    setIsAiLoading(false);
  };

  const latestSummary = summaries.length > 0 ? summaries[summaries.length - 1] : null;
  const prediction = useMemo(() => getPerformancePrediction(summaries), [summaries]);
  
  const nutritionStats = useMemo(() => {
    const last7 = summaries.slice(-7);
    if (last7.length === 0) return { cal: 0, prot: 0 };
    const totals = last7.reduce((acc, s) => {
      s.meals?.forEach(m => {
        acc.cal += (m.calories || 0);
        acc.prot += (m.protein || 0);
      });
      return acc;
    }, { cal: 0, prot: 0 });
    return { 
      cal: Math.round(totals.cal / last7.length), 
      prot: Math.round(totals.prot / last7.length) 
    };
  }, [summaries]);

  const avgFatigue = summaries.length > 0 ? Math.round(summaries.reduce((sum, s) => sum + (s.fatigue || 0), 0) / summaries.length) : 0;
  const avgScreenTime = summaries.length > 0 ? (summaries.reduce((sum, s) => sum + (s.screenTime || 0), 0) / summaries.length).toFixed(1) : "0";

  const monthlyEfficiency = useMemo(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthDays = summaries.filter(s => s.date.startsWith(currentMonthStr));
    if (monthDays.length === 0) return 0;
    const actual = monthDays.reduce((sum, s) => sum + s.studyHours, 0);
    const planned = monthDays.length * 6; 
    return Math.round((actual / planned) * 100);
  }, [summaries]);

  const sleepConsistency = useMemo(() => {
    if (summaries.length < 2) return 100;
    const startMinutes = summaries.flatMap(s => s.sleepSlots.slice(0, 1).map(slot => {
      const [h, m] = slot.start.split(':').map(Number);
      return h * 60 + m;
    }));
    if (startMinutes.length < 2) return 100;
    const avg = startMinutes.reduce((a, b) => a + b) / startMinutes.length;
    const variance = startMinutes.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / startMinutes.length;
    return Math.round(Math.max(0, 100 - Math.sqrt(variance)));
  }, [summaries]);

  const activityFrequency = summaries.filter(s => s.activities.some(a => ['gym', 'running', 'sports'].includes(a.type))).length;

  const weeklyHistory = useMemo(() => {
    if (summaries.length === 0) return [];
    const weeks: Record<string, { actual: number, count: number }> = {};
    
    summaries.forEach(s => {
      const d = new Date(s.date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
      const monday = new Date(d.setDate(diff));
      const weekKey = monday.toISOString().split('T')[0];
      
      if (!weeks[weekKey]) weeks[weekKey] = { actual: 0, count: 0 };
      weeks[weekKey].actual += s.studyHours;
      weeks[weekKey].count += 1;
    });

    return Object.entries(weeks)
      .map(([date, data]) => ({
        week: date,
        efficiency: Math.round((data.actual / (7 * 6)) * 100), // Target 42h/week
        hours: data.actual
      }))
      .sort((a, b) => b.week.localeCompare(a.week))
      .slice(0, 4);
  }, [summaries]);

  const avgSleep = useMemo(() => {
    if (summaries.length === 0) return "0";
    let totalSleep = 0;
    summaries.forEach(s => {
      s.sleepSlots.forEach(slot => {
        const [h1, m1] = slot.start.split(':').map(Number);
        const [h2, m2] = slot.end.split(':').map(Number);
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 24 * 60;
        totalSleep += diff / 60;
      });
    });
    return (totalSleep / summaries.length).toFixed(1);
  }, [summaries]);

  const activeDaysLast7 = useMemo(() => {
    const last7 = summaries.slice(-7);
    return last7.filter(s => s.studyHours > 0 || (s.activities && s.activities.length > 0)).length;
  }, [summaries]);

  const getPerformanceSuggestion = () => {
    if (summaries.length === 0) return "Start logging your daily status to get personalized insights!";
    if (prediction.score > 80) return "Optimal state detected! Elite focus predicted for today.";
    if (prediction.score < 40) return "Energy debt detected. Prioritize recovery and low-intensity tasks.";
    return prediction.reason;
  };

  const getDayEfficiencyColor = (score: number) => {
    if (score > 80) return "text-green-400";
    if (score > 60) return "text-blue-400";
    if (score > 40) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 glass rounded-xl hover:bg-white/10 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold grad-text">Daily Wellness & Summary</h1>
            <p className="text-sm opacity-50">Tracking your productivity, activities, and fatigue</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={() => router.push("/summary/log?mode=quick")}
                className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 glass rounded-xl hover:opacity-80 transition-all flex items-center gap-2" 
                style={{ background: "rgba(234, 179, 8, 0.1)", color: "#eab308", border: "1px solid rgba(234, 179, 8, 0.2)" }}>
                <Zap size={14} /> Quick Log
              </button>
              <button 
                onClick={() => router.push("/summary/log?mode=eod")}
                className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 glass rounded-xl hover:bg-white/10 transition-all flex items-center gap-2" 
                style={{ background: "var(--tint-accent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                <Moon size={14} /> Log EOD
              </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Calendar View */}
            <div className="lg:col-span-2 space-y-8">
              <div className="glass p-6 rounded-3xl">
                <SummaryCalendar 
                  summaries={summaries} 
                  studySessions={studySessions} 
                  manualLectureRefs={manualLectureRefs} 
                />
              </div>

              {/* Today's Study Details Section */}
              <div className="glass p-8 rounded-3xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-accent">
                    <BookOpen size={20} />
                    <h3 className="text-sm font-black uppercase tracking-widest">Today&apos;s Study Detail</h3>
                  </div>
                  <span className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{new Date().toDateString()}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(studySessions || []).filter(s => new Date(s.startedAt).toDateString() === new Date().toDateString()).length > 0 ? (
                    (studySessions || [])
                      .filter(s => new Date(s.startedAt).toDateString() === new Date().toDateString())
                      .map((s, i) => (
                        <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-center group hover:border-accent/30 transition-all">
                          <div>
                            <p className="text-[10px] font-black uppercase text-accent mb-1">{s.subjectName}</p>
                            <p className="text-xs font-medium opacity-60 line-clamp-1">{s.moduleName || "General Session"}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-sm font-black">{s.durationMinutes}m</p>
                             <p className="text-[9px] opacity-30 font-mono">{new Date(s.startedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="col-span-full py-10 text-center opacity-30 italic text-sm">
                      No manual sessions logged for today yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Weekly Analytics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass p-5 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-all">
                    <TrendingUp size={60} />
                  </div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Study Efficiency (7d)</h4>
                  <p className="text-3xl font-bold text-green-400">{efficiency}%</p>
                  <p className="text-[10px] mt-2 opacity-60">Monthly Efficiency: {monthlyEfficiency}%</p>
                </div>
                <div className="glass p-5 rounded-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-all">
                    <Zap size={60} />
                  </div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Avg Body Fatigue</h4>
                  <p className="text-3xl font-bold text-orange-400">{avgFatigue}%</p>
                  <p className="text-[10px] mt-2 opacity-60">Consistency: {sleepConsistency}%</p>
                </div>
              </div>

              {/* Weekly Trends */}
              <div className="glass p-6 rounded-3xl">
                <h4 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-6 flex items-center gap-2">
                  <Activity size={14} className="text-accent" /> Weekly Efficiency Trends
                </h4>
                <div className="space-y-4">
                  {weeklyHistory.map((w, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="text-[10px] w-24 opacity-40 font-mono">w/c {new Date(w.week).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent transition-all duration-500" 
                          style={{ width: `${Math.min(100, w.efficiency)}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-bold w-12 text-right">{w.efficiency}%</div>
                      <div className="text-[9px] opacity-30 w-16 italic text-right">{w.hours}h tot.</div>
                    </div>
                  ))}
                  {weeklyHistory.length === 0 && <p className="text-sm opacity-30 text-center py-4 italic">Not enough data to show trends yet.</p>}
                </div>
              </div>
            </div>

            {/* Sidebar: Insights & Predictions */}
            <div className="space-y-6">
              {/* AI Daily Remark Box */}
              <div className="glass p-6 rounded-3xl bg-gradient-to-br from-accent/10 to-blue-500/10 border border-accent/20 relative group">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-accent">
                       <Brain size={18} className="animate-pulse" />
                       <div>
                          <h4 className="text-sm font-black uppercase tracking-widest">AI Status Remark</h4>
                          {aiTimestamp && (
                             <p className="text-[9px] opacity-40 font-bold">LAST SYNCED: {aiTimestamp}</p>
                          )}
                       </div>
                    </div>
                    <button 
                       onClick={() => fetchRemark(username, true)} 
                       disabled={isAiLoading}
                       className="p-1.5 hover:bg-white/10 rounded-lg transition-all opacity-40 hover:opacity-100 disabled:animate-spin"
                    >
                       <RefreshCw size={14} />
                    </button>
                 </div>
                 
                 {isAiLoading ? (
                    <div className="space-y-2 py-2">
                       <div className="h-2 bg-white/5 rounded-full animate-pulse w-full"></div>
                       <div className="h-2 bg-white/5 rounded-full animate-pulse w-3/4"></div>
                    </div>
                 ) : aiRemark ? (
                    <div className="text-sm leading-relaxed text-white/90 font-medium">
                       {aiRemark}
                    </div>
                 ) : (
                    <div className="text-center py-4 space-y-4">
                       <p className="text-xs opacity-50 italic">No recent insight generated.</p>
                       <button 
                          onClick={() => fetchRemark(username, true)}
                          className="px-6 py-2 bg-accent text-bg text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-accent/20"
                       >
                          Analyze Current Situation
                       </button>
                    </div>
                 )}
                 <div className="mt-4 flex items-center gap-2 opacity-30 text-[9px] font-bold uppercase tracking-widest">
                    <Sparkles size={10} /> Powered by Gemini
                 </div>
              </div>

              {/* Daily Prediction Engine */}
              <div className="glass p-6 rounded-3xl relative overflow-hidden border-accent/20 border group">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-2 text-accent">
                    <Sparkles size={18} />
                    <h4 className="text-sm font-bold uppercase tracking-wider">Day Forecast</h4>
                  </div>
                  <div className={`text-xl font-black ${getDayEfficiencyColor(prediction.score)}`}>
                    {prediction.score}%
                  </div>
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 bg-gradient-to-r from-accent to-blue-400`}
                      style={{ width: `${prediction.score}%` }} 
                    />
                  </div>
                  <p className="text-xs leading-relaxed text-white/70 italic border-l-2 border-accent/30 pl-3">
                    "{getPerformanceSuggestion()}"
                  </p>
                </div>
              </div>

              {/* Latest Outcome */}
              <div className="glass p-6 rounded-3xl">
                <h4 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-4 flex items-center gap-2">
                  <Brain size={14} /> Latest Day Outcome
                </h4>
                {latestSummary ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold opacity-60">
                      <span>{new Date(latestSummary.date).toDateString()}</span>
                      <span className="text-accent">{latestSummary.studyHours}h Studied</span>
                    </div>
                    <p className="text-sm italic opacity-80 border-l-2 border-accent/30 pl-3">
                      "{latestSummary.outcome || "No notes for this day."}"
                    </p>
                  </div>
                ) : (
                  <p className="text-sm opacity-40">No data yet.</p>
                )}
              </div>

              {/* Nutrition Insight */}
              <div className="glass p-6 rounded-3xl space-y-4">
                 <h4 className="text-xs font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
                    <Apple size={14} className="text-green-400" /> Nutrition (Avg 7d)
                 </h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-3 rounded-2xl">
                       <p className="text-[10px] uppercase opacity-40 mb-1">Calories</p>
                       <p className="text-xl font-bold">{nutritionStats.cal}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-2xl">
                       <p className="text-[10px] uppercase opacity-40 mb-1">Protein</p>
                       <p className="text-xl font-bold text-green-400">{nutritionStats.prot}g</p>
                    </div>
                 </div>
                 <p className="text-[9px] opacity-40 text-center italic">Fueling {efficiency > 80 ? "elite" : "steady"} study sessions.</p>
              </div>

              {/* Energy Dips / Sleepy Times */}
              <div className="glass p-6 rounded-3xl">
                <h4 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-4 flex items-center gap-2">
                  <Clock size={14} className="text-yellow-400" /> Energy Dips
                </h4>
                <div className="flex flex-wrap gap-2">
                  {latestSummary?.sleepyTimes?.map((t, i) => (
                    <span key={i} className="px-2 py-1 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-[10px] font-bold rounded-lg flex items-center gap-1">
                      <Zap size={10} /> {t}
                    </span>
                  )) || <p className="text-[10px] opacity-30 italic">No dips logged today.</p>}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="glass p-6 rounded-3xl space-y-4">
                 <h4 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Metrics Dashboard</h4>
                 <div className="flex items-center justify-between">
                    <span className="text-xs opacity-60 flex items-center gap-2"><Moon size={14} /> Night Sleep</span>
                    <span className="text-xs font-bold">{(latestSummary?.sleepSlots?.[0]?.start) ? "Logged" : "N/A"}</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-xs opacity-60 flex items-center gap-2"><Activity size={14} /> Screen Time</span>
                    <span className="text-xs font-bold text-orange-400">{avgScreenTime}h avg.</span>
                 </div>
                 <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-[10px] opacity-60">Habit Frequency</span>
                    <span className="text-[10px] font-bold text-accent">{(latestSummary?.habits?.length || 0)} done today</span>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
