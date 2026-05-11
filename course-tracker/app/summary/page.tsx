"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Brain, Moon, Zap, Activity, Info, Sparkles, Flame, Clock, Target, RefreshCw, BookOpen } from "lucide-react";
import { getCurrentUser, getUser, DailySummary, getPerformancePrediction, getAiWellnessInsight, StudySession } from "@/lib/store";
import SummaryCalendar from "@/components/SummaryCalendar";
import type { Subject } from "@/lib/courseLoader";
import weeklyPlanData from "@/lib/weeklyPlan.json";
import { useExtendedWeeklyPlan } from "@/lib/useExtendedWeeklyPlan";
import type { WeekData } from "@/lib/backlog";

export default function SummaryPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [manualLectureRefs, setManualLectureRefs] = useState<Record<string, number | false>>({});
  const [completedLectures, setCompletedLectures] = useState<Record<string, number | false>>({});
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [efficiency, setEfficiency] = useState(0);
  const [aiRemark, setAiRemark] = useState("");
  const [aiTimestamp, setAiTimestamp] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const EFFICIENCY_START_DATE = useMemo(() => new Date(2026, 3, 1), []);
  const DAILY_TARGET = 6;
  
  // Get extended weeks for lecture data
  const extendedWeeks = useExtendedWeeklyPlan(weeklyPlanData as WeekData[]);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace("/"); return; }
    setUsername(u);

    // Load subjects from API
    fetch('/api/subjects')
      .then(res => res.json())
      .then(data => setSubjects(data.subjects || []))
      .catch(err => console.error('Failed to load subjects:', err));

    // Load user data to get summaries
    getUser(u).then((data) => {
      setSummaries(data.dailySummaries || []);
      setStudySessions(data.studySessions || []);
      setManualLectureRefs(data.manualLectureRefs || {});
      setCompletedLectures(data.completedLectures || {});
      
      // Calculate current 20-day interval efficiency
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - EFFICIENCY_START_DATE.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const intervalIndex = Math.floor(diffDays / 20);
      const intervalStart = new Date(EFFICIENCY_START_DATE);
      intervalStart.setDate(intervalStart.getDate() + (intervalIndex * 20));
      intervalStart.setHours(0, 0, 0, 0);
      
      const intervalEnd = new Date(intervalStart);
      intervalEnd.setDate(intervalEnd.getDate() + 19);
      intervalEnd.setHours(23, 59, 59, 999);

      const intervalSessions = (data.studySessions || []).filter(s => {
        const d = new Date(s.startedAt);
        return d >= intervalStart && d <= intervalEnd;
      });

      const actualHours = intervalSessions.reduce((sum, s) => sum + (s.durationMinutes / 60), 0);
      const possibleDays = Math.min(20, Math.floor((now.getTime() - intervalStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const plannedHours = possibleDays * DAILY_TARGET;
      
      setEfficiency(plannedHours > 0 ? Math.round((actualHours / plannedHours) * 100) : 0);
      
      setIsLoading(false);
      
      // Initialize AI Remark from cached data
      if (data.lastAiWellnessRemark?.content) {
        setAiRemark(data.lastAiWellnessRemark.content);
        if (data.lastAiWellnessRemark.timestamp) {
          setAiTimestamp(new Date(data.lastAiWellnessRemark.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        }
      }
    });
  }, [router, EFFICIENCY_START_DATE]);

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
  
  const monthlyEfficiency = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthSessions = studySessions.filter(s => {
      const d = new Date(s.startedAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    
    if (monthSessions.length === 0) return 0;
    const actual = monthSessions.reduce((sum, s) => sum + (s.durationMinutes / 60), 0);
    
    // Calculate days passed in current month
    const daysElapsed = now.getDate();
    const planned = daysElapsed * DAILY_TARGET; 
    return Math.round((actual / planned) * 100);
  }, [studySessions]);

  const twentyDayHistory = useMemo(() => {
    if (studySessions.length === 0) return [];
    const bins: Record<number, { actual: number, count: number, start: Date }> = {};
    
    studySessions.forEach(s => {
      const d = new Date(s.startedAt);
      if (d < EFFICIENCY_START_DATE) return;
      
      const diffTime = d.getTime() - EFFICIENCY_START_DATE.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const intervalIndex = Math.floor(diffDays / 20);
      
      if (!bins[intervalIndex]) {
        const start = new Date(EFFICIENCY_START_DATE);
        start.setDate(start.getDate() + (intervalIndex * 20));
        bins[intervalIndex] = { actual: 0, count: 0, start };
      }
      bins[intervalIndex].actual += (s.durationMinutes / 60);
      bins[intervalIndex].count += 1;
    });

    const roadmap = [];
    const now = new Date();
    
    for (let i = 0; i < 15; i++) {
        const intervalStart = new Date(EFFICIENCY_START_DATE);
        intervalStart.setDate(intervalStart.getDate() + (i * 20));
        intervalStart.setHours(0, 0, 0, 0);
        
        const intervalEnd = new Date(intervalStart);
        intervalEnd.setDate(intervalEnd.getDate() + 19);
        intervalEnd.setHours(23, 59, 59, 999);
        
        const intervalSessions = studySessions.filter(s => {
          const d = new Date(s.startedAt);
          return d >= intervalStart && d <= intervalEnd;
        });
        
        const actual = intervalSessions.reduce((sum, s) => sum + (s.durationMinutes / 60), 0);
        const isCurrent = now >= intervalStart && now <= intervalEnd;
        const isPast = now > intervalEnd;
        
        roadmap.push({
          index: i,
          startDate: intervalStart,
          endDate: intervalEnd,
          efficiency: Math.round((actual / (20 * DAILY_TARGET)) * 100),
          hours: actual,
          label: `Interval ${i + 1}`,
          status: isCurrent ? 'Active' : isPast ? 'Completed' : 'Upcoming'
        });
    }

    return roadmap; // Keep it chronological (Interval 1 first)
  }, [studySessions, EFFICIENCY_START_DATE]);

  const todayEfficiency = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todaySessions = studySessions.filter(s => new Date(s.startedAt).toDateString() === todayStr);
    const actual = todaySessions.reduce((sum, s) => sum + (s.durationMinutes / 60), 0);
    return Math.round((actual / DAILY_TARGET) * 100);
  }, [studySessions]);

  const totalSessionsToday = useMemo(() => {
    return studySessions.filter(s => new Date(s.startedAt).toDateString() === new Date().toDateString()).length;
  }, [studySessions]);

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
            <h1 className="text-3xl font-bold grad-text">Study Summary & Insights</h1>
            <p className="text-sm opacity-50">Tracking your productivity and lecture completion</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Column: Calendar & Details */}
            <div className="lg:col-span-2 space-y-8">
              <div className="glass p-6 rounded-3xl">
                <SummaryCalendar 
                  summaries={summaries} 
                  studySessions={studySessions} 
                  manualLectureRefs={manualLectureRefs}
                  completedLectures={completedLectures}
                  subjects={subjects}
                  onDateClick={setSelectedDate}
                  selectedDate={selectedDate}
                />
              </div>

              {/* Day Study Details Section - Dynamic based on selected date */}
              <div className="glass p-8 rounded-3xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-accent">
                    <BookOpen size={20} />
                    <h3 className="text-sm font-black uppercase tracking-widest">
                      {(() => {
                        const todayStr = new Date().toISOString().split("T")[0];
                        const selectedDateStr = selectedDate || todayStr;
                        const selectedDateObj = new Date(selectedDateStr + "T00:00:00");
                        const isToday = selectedDateStr === todayStr;
                        
                        if (isToday) return "Today's Study Detail";
                        
                        return selectedDateObj.toLocaleDateString("en-US", { 
                          month: "short", 
                          day: "numeric",
                          year: selectedDateObj.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
                        }) + " Study Detail";
                      })()}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedDate && selectedDate !== new Date().toISOString().split("T")[0] && (
                      <button
                        onClick={() => setSelectedDate(null)}
                        className="text-xs px-3 py-1.5 glass rounded-lg hover:bg-white/10 transition-all"
                      >
                        Back to Today
                      </button>
                    )}
                    <span className="text-[10px] opacity-40 font-bold uppercase tracking-widest">
                      {(() => {
                        const dateStr = selectedDate || new Date().toISOString().split("T")[0];
                        return new Date(dateStr + "T00:00:00").toDateString();
                      })()}
                    </span>
                  </div>
                </div>
                
                {(() => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  const selectedDateStr = selectedDate || todayStr;
                  const selectedDateObj = new Date(selectedDateStr + "T00:00:00");
                  
                  // Get sessions for selected date
                  const daySessions = (studySessions || []).filter(s => 
                    new Date(s.startedAt).toDateString() === selectedDateObj.toDateString()
                  );
                  
                  // Get completed lectures for selected date
                  const dayPlan = extendedWeeks.flatMap(w => w.days).find(day => day.date === selectedDateStr);
                  const dayCompletedLectures: Array<{ subject: string; module: string; ref: string; lectureId?: string }> = [];
                  
                  // First, collect lectures from manualLectureRefs (weekly plan specific)
                  if (dayPlan && manualLectureRefs) {
                    dayPlan.tasks.forEach((task: any, taskIdx: number) => {
                      const refs = task.lectureRefs || [];
                      refs.forEach((ref: string, idx: number) => {
                        const key = `${selectedDateStr}|${task.subject}|${task.module}|${taskIdx}|${idx}|${ref}`;
                        if (manualLectureRefs[key]) {
                          dayCompletedLectures.push({ 
                            subject: task.subject, 
                            module: task.module, 
                            ref,
                            lectureId: task.lectureIds?.[idx]
                          });
                        }
                      });
                    });
                  }
                  
                  // Also check completedLectures map for lectures completed on this date
                  // (lectures marked as done from module pages, not just weekly plan)
                  Object.entries(completedLectures).forEach(([lectureId, timestamp]) => {
                    if (timestamp) {
                      const completedDate = new Date(timestamp).toISOString().split("T")[0];
                      if (completedDate === selectedDateStr) {
                        // Find lecture details from subjects
                        for (const subject of subjects) {
                          for (const mod of subject.modules) {
                            const lecture = mod.lectures.find(l => l.id === lectureId);
                            if (lecture) {
                              // Check if not already added from manualLectureRefs
                              const alreadyAdded = dayCompletedLectures.some(cl => cl.lectureId === lectureId);
                              if (!alreadyAdded) {
                                dayCompletedLectures.push({
                                  subject: subject.name,
                                  module: mod.name,
                                  ref: lecture.title,
                                  lectureId: lectureId
                                });
                              }
                              break;
                            }
                          }
                        }
                      }
                    }
                  });
                  
                  // Build lecture details map
                  const lectureDetailsMap = new Map<string, { title: string; duration: number }>();
                  for (const subject of subjects) {
                    for (const mod of subject.modules) {
                      for (const lecture of mod.lectures) {
                        lectureDetailsMap.set(lecture.id, {
                          title: lecture.title,
                          duration: lecture.duration || 0,
                        });
                      }
                    }
                  }
                  
                  // Calculate totals
                  const totalLectureHours = dayCompletedLectures.reduce((sum, lecture) => {
                    if (lecture.lectureId) {
                      const details = lectureDetailsMap.get(lecture.lectureId);
                      if (details) {
                        return sum + (details.duration / 3600);
                      }
                    }
                    return sum;
                  }, 0);
                  
                  const totalSessionHours = daySessions.reduce((sum, s) => sum + (s.durationMinutes / 60), 0);
                  const totalHours = totalLectureHours + totalSessionHours;
                  const DAILY_TARGET = 5;
                  
                  // Backlog coverage: Lecture hours - 5 hours target
                  const backlogCoverage = totalLectureHours - DAILY_TARGET;
                  
                  return (
                    <>
                      {/* Summary Stats */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-blue-400/20">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={14} className="text-blue-400" />
                            <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Lectures</p>
                          </div>
                          <p className="text-2xl font-bold text-blue-400">{totalLectureHours.toFixed(2)}h</p>
                          <p className="text-xs opacity-40 mt-1">{dayCompletedLectures.length} completed</p>
                        </div>

                        <div className="bg-white/5 p-4 rounded-2xl border border-green-400/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock size={14} className="text-green-400" />
                            <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Sessions</p>
                          </div>
                          <p className="text-2xl font-bold text-green-400">{totalSessionHours.toFixed(2)}h</p>
                          <p className="text-xs opacity-40 mt-1">{daySessions.length} logged</p>
                        </div>

                        <div className={`bg-white/5 p-4 rounded-2xl border ${backlogCoverage >= 0 ? 'border-accent/20' : 'border-red-400/20'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={14} className={backlogCoverage >= 0 ? "text-accent" : "text-red-400"} />
                            <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Backlog Coverage</p>
                          </div>
                          <p className={`text-2xl font-bold ${backlogCoverage >= 0 ? "text-accent" : "text-red-400"}`}>
                            {backlogCoverage >= 0 ? "+" : ""}{backlogCoverage.toFixed(2)}h
                          </p>
                          <p className="text-xs opacity-40 mt-1">Lectures - {DAILY_TARGET}h</p>
                        </div>
                      </div>

                      {/* Total Hours Progress Bar */}
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold">Lecture Coverage</p>
                          <p className="text-lg font-bold grad-text">{totalLectureHours.toFixed(2)}h</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs opacity-60 mb-2">
                          <span className="text-blue-400">{totalLectureHours.toFixed(2)}h lectures</span>
                          <span>vs</span>
                          <span className="text-accent">{DAILY_TARGET}h target</span>
                          <span className="ml-auto text-green-400">({totalSessionHours.toFixed(2)}h sessions)</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (totalLectureHours / DAILY_TARGET) * 100)}%`,
                              background: totalLectureHours >= DAILY_TARGET 
                                ? "linear-gradient(90deg, var(--green), var(--accent))" 
                                : "linear-gradient(90deg, var(--accent), var(--accent2))"
                            }}
                          />
                        </div>
                        <p className="text-xs opacity-40 mt-2">
                          {totalLectureHours >= DAILY_TARGET 
                            ? `✓ Target met! +${(totalLectureHours - DAILY_TARGET).toFixed(2)}h backlog covered` 
                            : `${(DAILY_TARGET - totalLectureHours).toFixed(2)}h remaining to meet ${DAILY_TARGET}h target`}
                        </p>
                      </div>

                      {/* Completed Lectures */}
                      {dayCompletedLectures.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <BookOpen size={16} className="text-blue-400" />
                            <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Completed Lectures</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {dayCompletedLectures.map((lecture, i) => {
                              const details = lecture.lectureId ? lectureDetailsMap.get(lecture.lectureId) : null;
                              const duration = details ? (details.duration / 3600).toFixed(2) : "—";
                              
                              return (
                                <div 
                                  key={i}
                                  className="bg-blue-400/5 p-3 rounded-xl border border-blue-400/20 hover:border-blue-400/40 transition-all"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-blue-400 mb-1">{lecture.subject}</p>
                                      <p className="text-xs opacity-80 line-clamp-1">{lecture.ref}</p>
                                      <p className="text-xs opacity-40 mt-0.5">{lecture.module}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="text-sm font-bold text-blue-400">{duration}h</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Study Sessions */}
                      {daySessions.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Clock size={16} className="text-green-400" />
                            <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Study Sessions</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {daySessions.map((session, i) => (
                              <div 
                                key={i}
                                className="bg-green-400/5 p-3 rounded-xl border border-green-400/20 hover:border-green-400/40 transition-all"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-green-400 mb-1">{session.subjectName}</p>
                                    <p className="text-xs opacity-80 line-clamp-1">{session.moduleName || "General Session"}</p>
                                    <p className="text-xs opacity-40 mt-0.5 font-mono">
                                      {new Date(session.startedAt).toLocaleTimeString("en-GB", { 
                                        hour: "2-digit", 
                                        minute: "2-digit" 
                                      })}
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-bold text-green-400">{session.durationMinutes}m</p>
                                    <p className="text-xs opacity-40">{(session.durationMinutes / 60).toFixed(2)}h</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty State */}
                      {dayCompletedLectures.length === 0 && daySessions.length === 0 && (
                        <div className="text-center py-10">
                          <div className="text-4xl mb-3 opacity-20">📚</div>
                          <p className="text-sm opacity-60">No study activity recorded for this day</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Sidebar: Efficiency Metrics & Predictions */}
            <div className="space-y-6">
              {/* Study Efficiency Metrics Grid */}
              <div className="space-y-4">
                {/* Today's Efficiency Card */}
                <div className="glass p-6 rounded-3xl relative overflow-hidden group border border-white/5">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                      <Target size={48} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4">Today&apos;s Efficiency</h4>
                    <div className="flex items-end gap-2">
                       <p className={`text-4xl font-black ${todayEfficiency >= 80 ? "text-accent" : "text-blue-400"}`}>{todayEfficiency}%</p>
                       <p className="text-[10px] opacity-30 font-bold mb-1 ml-auto lowercase">target {DAILY_TARGET}h</p>
                    </div>
                </div>

                {/* Interval Efficiency Card */}
                <div className="glass p-6 rounded-3xl relative overflow-hidden group border border-white/5">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                      <TrendingUp size={48} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4">Interval Efficiency</h4>
                    <div className="flex items-end gap-2">
                       <p className="text-4xl font-black text-green-400">{efficiency}%</p>
                       <p className="text-[10px] opacity-30 font-bold mb-1 ml-auto lowercase">monthly {monthlyEfficiency}%</p>
                    </div>
                </div>
              </div>

              {/* 20-Day Interval Roadmap */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between mb-4 px-2">
                   <div className="flex items-center gap-2">
                      <Activity size={14} className="text-accent" />
                      <h4 className="text-xs font-black uppercase tracking-widest text-white/50">Road to GATE 2027</h4>
                   </div>
                   <span className="text-[9px] font-black opacity-30 uppercase tracking-tighter">15 Intervals Total</span>
                </div>
                
                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                  {twentyDayHistory.map((h, i) => (
                    <div 
                      key={i} 
                      className={`glass p-5 rounded-2xl border transition-all relative overflow-hidden group 
                        ${h.status === 'Active' ? 'border-accent/50 bg-accent/5 shadow-lg shadow-accent/5' : 'border-white/5 hover:border-white/10'}
                        ${h.status === 'Upcoming' ? 'opacity-40 grayscale-[0.8]' : ''}`}
                    >
                      {h.status === 'Active' && (
                         <div className="absolute top-0 right-0 px-3 py-1 bg-accent text-bg text-[7px] font-black uppercase tracking-widest rounded-bl-xl z-20">
                            Current Block
                         </div>
                      )}
                      
                      <div className="flex justify-between items-center mb-3 relative z-10">
                        <div className="space-y-0.5">
                           <div className="flex items-center gap-2">
                              <p className={`text-[10px] font-black ${h.status === 'Active' ? 'text-accent' : 'text-white/80'}`}>{h.label}</p>
                              {h.status === 'Completed' && <span className="text-[7px] opacity-40 font-bold uppercase tracking-widest">Done</span>}
                           </div>
                           <p className="text-[9px] opacity-40 font-mono tracking-tighter">
                             {h.startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — {h.endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                           </p>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-black">{h.efficiency}%</p>
                           <p className="text-[8px] opacity-30 font-bold uppercase">{h.hours.toFixed(1)}h</p>
                        </div>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden relative z-10">
                        <div 
                          className={`h-full transition-all duration-700 ${h.status === 'Active' ? 'bg-accent' : h.status === 'Completed' ? 'bg-green-400/50' : 'bg-white/20'}`} 
                          style={{ width: `${Math.min(100, h.efficiency)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculation Insight */}
              <div className="glass p-5 rounded-2xl border border-white/5 bg-accent/5">
                 <h4 className="text-[9px] font-bold uppercase tracking-widest opacity-50 mb-2 flex items-center gap-2">
                    <Info size={12} /> Calculation Logic
                 </h4>
                 <ul className="space-y-2 text-[10px] opacity-60 leading-relaxed">
                    <li>• <span className="text-accent font-bold">Target</span>: Fixed 6 hours of study/day.</li>
                    <li>• <span className="text-accent font-bold">Efficiency</span>: (Actual Hours / Target Hours) × 100.</li>
                    <li>• <span className="text-accent font-bold">20-Day Block</span>: Grouped from Apr 1, 2026.</li>
                 </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
