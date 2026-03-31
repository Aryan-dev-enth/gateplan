"use client";
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Zap, Battery, Flame, Rocket, X, CheckSquare, BookOpen, ClipboardCheck, Info, Sparkles } from "lucide-react";
import { DailySummary, StudySession } from "@/lib/store";
import weeklyPlanData from "@/lib/weeklyPlan.json";

interface SummaryCalendarProps {
  summaries: DailySummary[];
  studySessions: StudySession[];
  manualLectureRefs: Record<string, number | false>;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getRangeLabel(h: number) {
  if (h === 0) return "0h";
  if (h < 2) return "0-2h";
  if (h < 4) return "2-4h";
  if (h < 6) return "4-6h";
  if (h < 8) return "6-8h";
  if (h < 10) return "8-10h";
  return "10h+";
}

export default function SummaryCalendar({ summaries, studySessions, manualLectureRefs }: SummaryCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getSummaryForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return summaries.find(s => s.date === dateStr);
  };

  const getSymbol = (summary?: DailySummary) => {
    if (!summary) return null;
    if (summary.type === "none" || summary.studyHours === 0) return <X size={20} className="text-red-500" strokeWidth={3} />;
    
    if (summary.type === "revision") return <BookOpen size={18} className="text-blue-400" />;
    if (summary.type === "test") return <ClipboardCheck size={18} className="text-purple-400" />;
    if (summary.type === "partial") return <CheckSquare size={18} className="text-yellow-400" />;

    const h = summary.studyHours;
    if (h < 2) return <div className="w-2 h-2 rounded-full bg-white/40" />; 
    if (h < 4) return <Battery size={20} className="text-green-400 opacity-60" />;
    if (h < 6) return <Zap size={20} className="text-yellow-400" strokeWidth={2.5} />;
    if (h < 8) return <Flame size={20} className="text-orange-500" strokeWidth={2.5} />;
    if (h < 10) return <Rocket size={20} className="text-accent" strokeWidth={2.5} />;
    return <Sparkles size={22} className="text-accent animate-pulse" />;
  };

  const calendarDays = [];
  // Padding for first day
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`pad-${i}`} className="h-20 w-full" />);
  }
  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const summary = getSummaryForDate(d);
    const dateObj = new Date(year, month, d);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const daySessions = (studySessions || []).filter(s => new Date(s.startedAt).toDateString() === dateObj.toDateString());
    
    // Calculate lecture hours from manualLectureRefs and weeklyPlan
    let dayLectureHours = 0;
    const dayPlan = (weeklyPlanData as any[]).flatMap(w => w.days).find(day => day.date === dateStr);
    if (dayPlan && manualLectureRefs) {
      dayPlan.tasks.forEach((task: any) => {
        const refs = task.lectureRefs || [];
        const taskHours = task.hours || 0;
        const tickedCount = refs.filter((ref: string, idx: number) => {
          const key = `${dateStr}|${task.subject}|${task.module}|${idx}|${ref}`;
          return manualLectureRefs[key];
        }).length;
        if (refs.length > 0) {
          dayLectureHours += (tickedCount / refs.length) * taskHours;
        }
      });
    }
    const daySessionHours = daySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0) / 60;
    const dayTotalHours = dayLectureHours + daySessionHours;

    // Collect lecture details for tooltip
    const completedLectures: { subject: string; module: string; ref: string }[] = [];
    if (dayPlan && manualLectureRefs) {
      dayPlan.tasks.forEach((task: any) => {
        const refs = task.lectureRefs || [];
        refs.forEach((ref: string, idx: number) => {
          const key = `${dateStr}|${task.subject}|${task.module}|${idx}|${ref}`;
          if (manualLectureRefs[key]) {
            completedLectures.push({ subject: task.subject, module: task.module, ref });
          }
        });
      });
    }

    calendarDays.push(
      <div key={d} className="h-24 w-full glass bg-white/2 border border-white/5 rounded-xl p-2 flex flex-col items-center justify-between group hover:bg-white/5 transition-all relative">
        <span className="text-[10px] self-start opacity-40 font-bold">{d}</span>
        <div className="flex-1 flex items-center justify-center">
          {dayTotalHours > 0 ? (
             <div className="flex flex-col items-center">
                <div className="text-[10px] font-black text-accent">{dayTotalHours.toFixed(1)}h</div>
                <div className="text-[8px] opacity-40 font-bold">{dayLectureHours.toFixed(1)}L | {daySessionHours.toFixed(1)}S</div>
             </div>
          ) : (
             getSymbol(summary)
          )}
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 glass bg-[#0f172a]/95 p-3 flex flex-col gap-2 transition-all duration-200 rounded-2xl min-w-[200px] shadow-2xl border border-white/10 pointer-events-none">
             <div className="flex justify-between items-center font-black border-b border-white/10 pb-2 mb-1">
                <span className="text-accent text-xs">🚀 {dayTotalHours.toFixed(1)}h Study</span>
                {summary && (
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${summary.fatigue && summary.fatigue > 70 ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                    {summary.fatigue}% Fatigue
                  </span>
                )}
             </div>
             
             {/* Lectures Breakdown */}
             {completedLectures.length > 0 && (
               <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase opacity-40 flex items-center gap-1">📖 Lectures ({dayLectureHours.toFixed(1)}h)</p>
                  <div className="space-y-1">
                    {completedLectures.slice(0, 3).map((l, i) => (
                      <div key={i} className="flex justify-between items-center opacity-80 text-[8px] bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/10">
                        <span className="truncate max-w-[120px] font-bold">🎓 {l.subject} - {l.ref}</span>
                      </div>
                    ))}
                    {completedLectures.length > 3 && <p className="text-[8px] opacity-40 text-center">+{completedLectures.length - 3} more</p>}
                  </div>
               </div>
             )}

             {/* Study Sessions List */}
             {daySessions.length > 0 && (
               <div className="space-y-1 mt-1">
                  <p className="text-[9px] font-black uppercase opacity-40 flex items-center gap-1">✍️ Sessions ({daySessionHours.toFixed(1)}h)</p>
                  <div className="space-y-1">
                    {daySessions.slice(0, 4).map((s: StudySession, i: number) => (
                      <div key={i} className="flex justify-between items-center opacity-80 text-[9px] bg-white/5 px-2 py-1 rounded-lg">
                        <span className="truncate max-w-[100px] font-bold">⚡ {s.subjectName}</span>
                        <span className="text-accent font-black">{s.durationMinutes}m</span>
                      </div>
                    ))}
                    {daySessions.length > 4 && <p className="text-[8px] opacity-40 text-center">+{daySessions.length - 4} more</p>}
                  </div>
               </div>
             )}

             {summary && summary.activities.length > 0 && (
               <div className="pt-1 mt-1 border-t border-white/5">
                 <p className="text-[8px] font-black uppercase opacity-30 mb-1">Other Activities</p>
                 {summary.activities.slice(0, 2).map((a, i) => (
                   <div key={i} className="flex justify-between items-center opacity-50 text-[8px]">
                     <span className="truncate max-w-[80px]">{a.name}</span>
                     <span>{a.minutes}m</span>
                   </div>
                 ))}
               </div>
             )}
             
             {summary && (
               <div className="mt-2 pt-2 border-t border-accent/20 flex gap-3 justify-center text-[10px] font-black">
                  <div className="flex flex-col items-center"><span className="opacity-40 text-[7px] uppercase tracking-tighter">Prod</span>{summary.scores.productivity}</div>
                  <div className="flex flex-col items-center"><span className="opacity-40 text-[7px] uppercase tracking-tighter">Focus</span>{summary.scores.focus}</div>
                  <div className="flex flex-col items-center"><span className="opacity-40 text-[7px] uppercase tracking-tighter">Lazy</span>{summary.scores.laziness}</div>
               </div>
             )}
          </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black grad-text">Performance Calendar</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 glass rounded-xl hover:bg-white/10 transition-all"><ChevronLeft size={16} /></button>
          <span className="text-sm font-bold min-w-[120px] text-center">
            {currentDate.toLocaleString("default", { month: "long" })} {year}
          </span>
          <button onClick={nextMonth} className="p-2 glass rounded-xl hover:bg-white/10 transition-all"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {DAYS.map(d => <div key={d} className="text-center text-[10px] font-black uppercase opacity-40 pb-2">{d}</div>)}
        {calendarDays}
      </div>

      <div className="pt-6 border-t border-white/5">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Study Intensity Legend</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <X size={14} className="text-red-500" /> 0h (Rest/Off)
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <div className="w-2 h-2 rounded-full bg-white/40" /> 0-2h
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <Battery size={14} className="text-green-400 opacity-60" /> 2-4h
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <Zap size={14} className="text-yellow-400" /> 4-6h
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <Flame size={14} className="text-orange-500" /> 6-8h
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <Rocket size={14} className="text-accent" /> 8-10h
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <Sparkles size={14} className="text-accent" /> 10h+
          </div>
        </div>
      </div>
    </div>
  );
}
