"use client";
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from "lucide-react";

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CustomDatePicker({ value, onChange }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date());

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleSelect = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const calendarDays = [];
  const today = new Date().toISOString().split("T")[0];

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`pad-${i}`} className="h-8 w-8" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isSelected = value === dateStr;
    const isToday = today === dateStr;

    calendarDays.push(
      <button
        key={d}
        onClick={() => handleSelect(d)}
        className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-all relative ${
          isSelected 
            ? "bg-accent text-white font-bold shadow-lg shadow-accent/40" 
            : "hover:bg-accent/10 opacity-70 hover:opacity-100 text-text"
        } ${isToday && !isSelected ? "border border-accent/50" : ""}`}
      >
        {d}
        {isToday && !isSelected && (
          <div className="absolute bottom-1 w-1 h-1 bg-accent rounded-full" />
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input-glow w-full rounded-xl pl-12 pr-4 py-2.5 bg-surface2 border border-border flex items-center gap-3 text-sm transition-all text-left relative"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        <CalendarIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-accent opacity-60" />
        {value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Select Date"}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[110]" onClick={() => setIsOpen(false)} />
          <div 
            className="absolute top-12 left-0 z-[120] w-64 glass rounded-2xl p-4 shadow-2xl animate-in zoom-in-95 duration-150 border border-border"
            style={{ background: "var(--glass-bg)", backdropFilter: "blur(12px)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text">{months[month]} {year}</h4>
              <div className="flex gap-1">
                <button type="button" onClick={prevMonth} className="p-1.5 hover:bg-white/10 rounded-lg text-text"><ChevronLeft size={14} /></button>
                <button type="button" onClick={nextMonth} className="p-1.5 hover:bg-white/10 rounded-lg text-text"><ChevronRight size={14} /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
              {days.map(d => (
                <div key={d} className="text-[10px] text-center opacity-30 font-bold text-text">{d[0]}</div>
              ))}
              {calendarDays}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 px-3 py-1 text-text"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
