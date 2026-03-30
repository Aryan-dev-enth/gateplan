"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Brain, Moon, Zap, Activity, Info, Sparkles } from "lucide-react";
import { getCurrentUser, getUser, DailySummary } from "@/lib/store";
import SummaryCalendar from "@/components/SummaryCalendar";

export default function SummaryPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [efficiency, setEfficiency] = useState(0);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace("/"); return; }
    setUsername(u);

    // Load user data to get summaries
    getUser(u).then((data) => {
      setSummaries(data.dailySummaries || []);
      
      // Calculate weekly efficiency (simple for now: last 7 days)
      const last7Days = data.dailySummaries?.slice(-7) || [];
      const actualHours = last7Days.reduce((sum, s) => sum + s.studyHours, 0);
      // Mock planned: usually ~6h/day = 42h/week
      const plannedHours = 42; 
      setEfficiency(Math.round((actualHours / plannedHours) * 100));
      
      setIsLoading(false);
    });
  }, [router]);

  const latestSummary = summaries.length > 0 ? summaries[summaries.length - 1] : null;
  const avgFatigue = summaries.length > 0 ? Math.round(summaries.reduce((sum, s) => sum + (s.fatigue || 0), 0) / summaries.length) : 0;

  const monthlyEfficiency = (() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthDays = summaries.filter(s => s.date.startsWith(currentMonthStr));
    if (monthDays.length === 0) return 0;
    const actual = monthDays.reduce((sum, s) => sum + s.studyHours, 0);
    const planned = monthDays.length * 6; 
    return Math.round((actual / planned) * 100);
  })();

  const sleepConsistency = (() => {
    if (summaries.length < 2) return 100;
    const startMinutes = summaries.flatMap(s => s.sleepSlots.slice(0, 1).map(slot => {
      const [h, m] = slot.start.split(':').map(Number);
      return h * 60 + m;
    }));
    if (startMinutes.length < 2) return 100;
    const avg = startMinutes.reduce((a, b) => a + b) / startMinutes.length;
    const variance = startMinutes.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / startMinutes.length;
    return Math.round(Math.max(0, 100 - Math.sqrt(variance)));
  })();

  const activityFrequency = summaries.filter(s => s.activities.some(a => ['gym', 'running', 'sports'].includes(a.type))).length;

  const weeklyHistory = (() => {
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
  })();

  const avgSleep = summaries.length > 0 ? (() => {
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
  })() : "0";

  const activeDaysLast7 = (() => {
    const last7 = summaries.slice(-7);
    return last7.filter(s => s.studyHours > 0 || (s.activities && s.activities.length > 0)).length;
  })();

  const getPerformanceSuggestion = () => {
    if (summaries.length === 0) return "Start logging your daily status to get personalized insights!";
    
    if (latestSummary && (latestSummary.fatigue || 0) > 70) {
      return "You've been pushing hard. Your body fatigue is high. Consider a 'Revision' day tomorrow with 8+ hours of sleep to recover.";
    }
    
    if (latestSummary && (latestSummary.scores.productivity || 0) > 8 && (latestSummary.fatigue || 0) < 40) {
      return "Your flow state is strong! Tomorrow looks like a high-performance day. Tackle your toughest module first thing in the morning.";
    }

    return "Maintain consistency. Your balance between physical activity and study is looking good.";
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 glass rounded-xl hover:bg-white/10 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold grad-text">Daily Wellness & Summary</h1>
            <p className="text-sm opacity-50">Tracking your productivity, activities, and fatigue</p>
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
                <SummaryCalendar summaries={summaries} />
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

            {/* Sidebar: Insights & Stats */}
            <div className="space-y-6">
              {/* Performance Suggestion */}
              <div className="glass p-6 rounded-3xl relative overflow-hidden border-accent/20 border">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl"></div>
                <div className="flex items-center gap-2 mb-4 text-accent">
                  <Sparkles size={18} />
                  <h4 className="text-sm font-bold uppercase tracking-wider">AI Insight</h4>
                </div>
                <p className="text-sm leading-relaxed mb-4 text-white/80">
                  {getPerformanceSuggestion()}
                </p>
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

              {/* Quick Stats */}
              <div className="glass p-6 rounded-3xl space-y-4">
                 <h4 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Health Metrics</h4>
                 <div className="flex items-center justify-between">
                    <span className="text-sm opacity-60 flex items-center gap-2"><Moon size={14} /> Avg Sleep</span>
                    <span className="text-sm font-bold">{avgSleep}h</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-sm opacity-60 flex items-center gap-2"><Activity size={14} /> Active Days</span>
                    <span className="text-sm font-bold">{activeDaysLast7}/7 <span className="text-[10px] opacity-40">(7d)</span></span>
                 </div>
                 <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-xs opacity-60">Sleep Consistency</span>
                    <span className="text-xs font-bold text-accent">{sleepConsistency}%</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-xs opacity-60">Activity Freq</span>
                    <span className="text-xs font-bold text-accent">{activityFrequency} sess.</span>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
