"use client";
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Zap, Battery, Flame, Rocket, X, CheckSquare, BookOpen, ClipboardCheck, Info, Sparkles } from "lucide-react";
import { DailySummary } from "@/lib/store";

interface SummaryCalendarProps {
  summaries: DailySummary[];
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

export default function SummaryCalendar({ summaries }: SummaryCalendarProps) {
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
    calendarDays.push(
      <div key={d} className="h-24 w-full glass bg-white/2 border border-white/5 rounded-xl p-2 flex flex-col items-center justify-between group hover:bg-white/5 transition-all relative">
        <span className="text-[10px] self-start opacity-40 font-bold">{d}</span>
        <div className="flex-1 flex items-center justify-center">
          {getSymbol(summary)}
        </div>
        
        {summary && (
          <div className="opacity-0 group-hover:opacity-100 absolute inset-0 z-10 glass bg-slate-900/95 p-2 flex flex-col gap-1 text-[9px] transition-opacity duration-200 rounded-xl overflow-hidden">
             <div className="flex justify-between font-bold border-b border-white/10 pb-1 mb-1">
                <span>{getRangeLabel(summary.studyHours)} Study</span>
                <span className={summary.fatigue && summary.fatigue > 70 ? "text-red-400" : "text-green-400"}>
                  {summary.fatigue}% Fatigued
                </span>
             </div>
             {summary.activities.slice(0, 2).map((a, i) => (
               <div key={i} className="flex justify-between items-center opacity-70">
                 <span className="truncate max-w-[40px]">{a.name}</span>
                 <span>{a.minutes}m</span>
               </div>
             ))}
             <div className="mt-auto pt-1 border-t border-white/5 flex gap-1 justify-center">
                <span title="Productivity">{summary.scores.productivity}</span>
                <span className="opacity-20">|</span>
                <span title="Focus">{summary.scores.focus}</span>
                <span className="opacity-20">|</span>
                <span title="Laziness">{summary.scores.laziness}</span>
             </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold">
          {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(currentDate)}
        </h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 glass rounded-lg hover:bg-white/10"><ChevronLeft size={18} /></button>
          <button onClick={nextMonth} className="p-2 glass rounded-lg hover:bg-white/10"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest opacity-40 py-2">
            {d}
          </div>
        ))}
        {calendarDays}
      </div>

      {/* Legend */}
      <div className="mt-8 glass p-5 rounded-2xl bg-white/2 border border-white/5">
        <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4">Study Intensity Legend</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <X size={14} className="text-red-500" /> 0h (Cross)
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
