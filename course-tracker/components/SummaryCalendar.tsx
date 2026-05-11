"use client";
import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Zap, Battery, Flame, Rocket, X, CheckSquare, BookOpen, ClipboardCheck, Info, Sparkles, Clock } from "lucide-react";
import { DailySummary, StudySession } from "@/lib/store";
import weeklyPlanData from "@/lib/weeklyPlan.json";
import { useExtendedWeeklyPlan } from "@/lib/useExtendedWeeklyPlan";
import type { WeekData } from "@/lib/backlog";
import type { Subject } from "@/lib/courseLoader";

interface SummaryCalendarProps {
  summaries: DailySummary[];
  studySessions: StudySession[];
  manualLectureRefs: Record<string, number | false>;
  completedLectures: Record<string, number | false>;
  subjects: Subject[];
  onDateClick: (date: string) => void;
  selectedDate: string | null;
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

function getIconForHours(h: number) {
  if (h === 0) return <X size={16} className="text-red-500/50" />;
  if (h < 2) return <div className="w-1.5 h-1.5 rounded-full bg-white/20" />;
  if (h < 4) return <Battery size={16} className="text-green-400 opacity-60" />;
  if (h < 6) return <Zap size={16} className="text-yellow-400" />;
  if (h < 8) return <Flame size={16} className="text-orange-500" />;
  if (h < 10) return <Rocket size={16} className="text-accent" />;
  return <Sparkles size={18} className="text-accent animate-pulse" />;
}

export default function SummaryCalendar({ summaries, studySessions, manualLectureRefs, completedLectures, subjects, onDateClick, selectedDate }: SummaryCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const extendedWeeks = useExtendedWeeklyPlan(weeklyPlanData as WeekData[]);

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
    const dayPlan = extendedWeeks.flatMap(w => w.days).find(day => day.date === dateStr);
    const daySessionHours = daySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0) / 60;

    // Collect lecture details and calculate lecture hours
    const dayCompletedLectures: { subject: string; module: string; ref: string; lectureId?: string }[] = [];
    
    // First, collect from manualLectureRefs (weekly plan)
    if (dayPlan && manualLectureRefs) {
      dayPlan.tasks.forEach((task: any, taskIdx: number) => {
        const refs = task.lectureRefs || [];
        refs.forEach((ref: string, idx: number) => {
          const key = `${dateStr}|${task.subject}|${task.module}|${taskIdx}|${idx}|${ref}`;
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
    Object.entries(completedLectures).forEach(([lectureId, timestamp]) => {
      if (timestamp) {
        const completedDate = new Date(timestamp).toISOString().split("T")[0];
        if (completedDate === dateStr) {
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
    
    // Calculate lecture hours from lecture durations
    const lectureDetailsMap = new Map<string, number>();
    for (const subject of subjects) {
      for (const mod of subject.modules) {
        for (const lecture of mod.lectures) {
          lectureDetailsMap.set(lecture.id, lecture.duration || 0);
        }
      }
    }
    
    const dayLectureHours = dayCompletedLectures.reduce((sum, lecture) => {
      if (lecture.lectureId) {
        const duration = lectureDetailsMap.get(lecture.lectureId);
        if (duration) {
          return sum + (duration / 3600);
        }
      }
      return sum;
    }, 0);
    
    const dayTotalHours = dayLectureHours + daySessionHours;

    calendarDays.push(
      <button 
        key={d} 
        onClick={() => onDateClick(dateStr)}
        className={`h-24 w-full glass bg-white/2 border rounded-xl p-2 flex flex-col items-center justify-between group hover:bg-white/5 transition-all relative cursor-pointer hover:scale-105 active:scale-95 ${
          selectedDate === dateStr ? 'border-accent bg-accent/10' : 'border-white/5'
        }`}
      >
        <span className="text-[10px] self-start opacity-40 font-bold">{d}</span>
        <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
          {getIconForHours(dayTotalHours)}
          {(dayLectureHours > 0 || daySessionHours > 0) && (
             <div className="flex flex-col items-center gap-0.5">
                {dayLectureHours > 0 && (
                  <div className="text-[9px] font-black text-blue-400 flex items-center gap-0.5">
                    <BookOpen size={8} />
                    {dayLectureHours.toFixed(1)}h
                  </div>
                )}
                {daySessionHours > 0 && (
                  <div className="text-[9px] font-black text-green-400 flex items-center gap-0.5">
                    <Clock size={8} />
                    {daySessionHours.toFixed(1)}h
                  </div>
                )}
             </div>
          )}
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 glass bg-[#0f172a]/98 p-3 flex flex-col gap-2 transition-all duration-200 rounded-2xl min-w-[200px] shadow-2xl border border-white/10 pointer-events-none">
             <div className="flex justify-between items-center font-black border-b border-white/10 pb-2 mb-1">
                <span className="text-accent text-xs">📊 Study Summary</span>
             </div>
             
             {/* Hours Breakdown */}
             <div className="flex items-center justify-between text-xs mb-1">
               <span className="text-blue-400 font-bold flex items-center gap-1">
                 <BookOpen size={10} /> Lectures
               </span>
               <span className="text-blue-400 font-black">{dayLectureHours.toFixed(2)}h</span>
             </div>
             <div className="flex items-center justify-between text-xs mb-1">
               <span className="text-green-400 font-bold flex items-center gap-1">
                 <Clock size={10} /> Sessions
               </span>
               <span className="text-green-400 font-black">{daySessionHours.toFixed(2)}h</span>
             </div>
             <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
               <span className="text-accent font-bold">Total</span>
               <span className="text-accent font-black">{dayTotalHours.toFixed(2)}h</span>
             </div>
             
             {/* Lectures Breakdown */}
             {dayCompletedLectures.length > 0 && (
               <div className="space-y-1 mt-2 pt-2 border-t border-white/10">
                  <p className="text-[9px] font-black uppercase opacity-40 flex items-center gap-1">📖 Completed Lectures ({dayCompletedLectures.length})</p>
                  <div className="space-y-1">
                    {dayCompletedLectures.slice(0, 3).map((l, i) => (
                      <div key={i} className="flex justify-between items-center opacity-80 text-[8px] bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/10">
                        <span className="truncate max-w-[120px] font-bold">🎓 {l.subject} - {l.ref}</span>
                      </div>
                    ))}
                    {dayCompletedLectures.length > 3 && <p className="text-[8px] opacity-40 text-center">+{dayCompletedLectures.length - 3} more</p>}
                  </div>
               </div>
             )}

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
             
             <div className="text-[8px] opacity-40 text-center mt-2 pt-2 border-t border-white/10">
               Click to view details below
             </div>
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
           <h2 className="text-xl font-black grad-text">Performance Calendar</h2>
           <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tight opacity-40 whitespace-nowrap">
                <X size={10} className="text-red-500" /> Rest
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tight opacity-40 whitespace-nowrap">
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" /> 0-2h
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tight opacity-50 whitespace-nowrap">
                <Battery size={10} className="text-green-400" /> 2-4h
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tight opacity-60 whitespace-nowrap">
                <Zap size={10} className="text-yellow-400" /> 4-6h
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tight opacity-70 whitespace-nowrap">
                <Flame size={10} className="text-orange-500" /> 6-8h
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tight opacity-80 whitespace-nowrap">
                <Rocket size={10} className="text-accent" /> 8-10h
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tight opacity-100 whitespace-nowrap">
                <Sparkles size={10} className="text-accent" /> 10h+
              </div>
           </div>
        </div>
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
    </div>
  );
}
