"use client";
import React, { useState, useEffect } from "react";
import { X, Moon, Dumbbell, Activity, Users, Plus, Trash2, Save, Smile, Frown, Meh, Zap, Battery, Flame, Rocket, CheckCircle2, Calendar, ChevronDown, Sparkles, BookOpen, RefreshCw } from "lucide-react";
import { DailySummary, Activity as ActivityType, SleepSlot, calculateFatigue } from "@/lib/store";
import CustomDatePicker from "./CustomDatePicker";

interface DailySummaryFormProps {
  username: string;
  initialDate?: string;
  initialSummaries?: DailySummary[];
  onSave: (summary: DailySummary) => void;
  onClose?: () => void;
  isPage?: boolean;
}

const ACTIVITY_TYPES = [
  { label: "Gym", value: "gym", icon: Dumbbell },
  { label: "Running", value: "running", icon: Activity },
  { label: "Sports", value: "sports", icon: Activity },
  { label: "Meditation", value: "meditation", icon: Sparkles },
  { label: "Yoga/Stretching", value: "yoga", icon: Sparkles },
  { label: "Reading", value: "reading", icon: BookOpen },
  { label: "Gaming", value: "gaming", icon: Zap },
  { label: "Hangout", value: "hangout", icon: Users },
  { label: "Walking", value: "walking", icon: Activity },
  { label: "Chores/Work", value: "work", icon: CheckCircle2 },
  { label: "Other", value: "other", icon: Plus },
];

const STUDY_TYPES = [
  { label: "Full Study", value: "study" },
  { label: "Partial", value: "partial" },
  { label: "Revision", value: "revision" },
  { label: "Test Day", value: "test" },
  { label: "No Study", value: "none" },
];

export default function DailySummaryForm({ username, initialDate, initialSummaries, onSave, onClose, isPage }: DailySummaryFormProps) {
  const [date, setDate] = useState(initialDate || new Date().toISOString().split("T")[0]);
  const [studyHours, setStudyHours] = useState(0);
  const [studyType, setStudyType] = useState<DailySummary["type"]>("study");
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [sleepSlots, setSleepSlots] = useState<SleepSlot[]>([{ start: "23:00", end: "07:00" }]);
  const [productivity, setProductivity] = useState(5);
  const [focus, setFocus] = useState(5);
  const [laziness, setLaziness] = useState(5);
  const [outcome, setOutcome] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);

  // Pre-fill if sumary exists for this date
  useEffect(() => {
    if (!initialSummaries) return;
    const existing = initialSummaries.find((s: DailySummary) => s.date === date);
    if (existing) {
      setStudyHours(existing.studyHours || 0);
      setStudyType(existing.type || "study");
      setActivities(existing.activities || []);
      setSleepSlots(existing.sleepSlots || [{ start: "23:00", end: "07:00" }]);
      setProductivity(existing.scores?.productivity || 5);
      setFocus(existing.scores?.focus || 5);
      setLaziness(existing.scores?.laziness || 5);
      setOutcome(existing.outcome || "");
      setIsUpdate(true);
    } else {
      // Reset to defaults if no existing entry for this date
      setStudyHours(0);
      setStudyType("study");
      setActivities([]);
      setSleepSlots([{ start: "23:00", end: "07:00" }]);
      setProductivity(5);
      setFocus(5);
      setLaziness(5);
      setOutcome("");
      setIsUpdate(false);
    }
  }, [date, initialSummaries]);

  const addActivity = () => {
    setActivities([...activities, { name: "", minutes: 30, type: "gym" }]);
  };

  const removeActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  const updateActivity = (index: number, updates: Partial<ActivityType>) => {
    const newActivities = [...activities];
    newActivities[index] = { ...newActivities[index], ...updates };
    setActivities(newActivities);
  };

  const addSleepSlot = () => {
    setSleepSlots([...sleepSlots, { start: "14:00", end: "15:00" }]);
  };

  const removeSleepSlot = (index: number) => {
    setSleepSlots(sleepSlots.filter((_, i) => i !== index));
  };

  const updateSleepSlot = (index: number, updates: Partial<SleepSlot>) => {
    const newSlots = [...sleepSlots];
    newSlots[index] = { ...newSlots[index], ...updates };
    setSleepSlots(newSlots);
  };

  const handleSave = async () => {
    console.log("DailySummaryForm: Initiating save", { date, studyHours, activities });
    setIsSaving(true);
    const summary: DailySummary = {
      date,
      studyHours,
      type: studyType,
      activities,
      sleepSlots,
      scores: { productivity, focus, laziness },
      outcome,
    };
    summary.fatigue = calculateFatigue(summary);
    
    try {
      await onSave(summary);
      console.log("DailySummaryForm: onSave callback completed");
      if (onClose) onClose();
    } catch (error) {
      console.error("DailySummaryForm: Save failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={isPage ? "w-full" : "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"}>
      <div className={`${isPage ? "" : "glass w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"} flex flex-col p-6`}>
        {!isPage && onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        )}

        <h2 className="text-2xl font-bold grad-text mb-6">
          {isUpdate ? "Update" : "Create"} Daily Summary
        </h2>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Log Date</label>
              <div className="flex items-center gap-2">
                <CustomDatePicker value={date} onChange={setDate} />
                <div className="flex gap-1">
                  <button onClick={() => setDate(new Date().toISOString().split("T")[0])} className="px-3 py-1.5 text-[10px] font-bold bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:border-accent transition-all">Today</button>
                  <button onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setDate(d.toISOString().split("T")[0]);
                  }} className="px-3 py-1.5 text-[10px] font-bold bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:border-accent transition-all">Yesterday</button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Day Category</label>
              <div className="relative group">
                <select 
                  value={studyType}
                  onChange={(e) => setStudyType(e.target.value as any)}
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] px-4 py-3 rounded-xl appearance-none focus:border-accent outline-none transition-all cursor-pointer"
                >
                  {STUDY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none group-hover:text-accent transition-colors" size={16} />
              </div>
            </div>
          </div>

          {/* Study Hours */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-widest opacity-60">Study Time</label>
              <span className="text-sm font-bold text-accent">{studyHours} hours</span>
            </div>
            <input 
              type="range" min="0" max="18" step="0.5" 
              value={studyHours} 
              onChange={(e) => setStudyHours(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-accent"
            />
            <div className="flex justify-between mt-2">
              <span className="text-[10px] opacity-40">0h</span>
              <span className="text-[10px] opacity-40">18h</span>
            </div>
          </div>

          {/* Activities */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-widest opacity-60">Activities (Gym, Sports, etc.)</label>
              <button onClick={addActivity} className="text-xs flex items-center gap-1 text-accent hover:opacity-80 transition-all font-bold">
                <Plus size={14} /> Add Activity
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {activities.length === 0 && (
                <p className="text-xs opacity-40 text-center py-4 glass bg-white/2 rounded-xl border border-dashed border-white/10">No activities added</p>
              )}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {activities.map((act, i) => (
                  <div key={i} className="flex gap-3 items-center bg-[var(--surface)] p-3 rounded-xl border border-[var(--border)] group animate-in slide-in-from-left duration-300">
                    <select
                      value={act.type}
                      onChange={(e) => updateActivity(i, { type: e.target.value as any })}
                      className="bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-xs rounded-lg px-2 py-2 outline-none focus:border-accent"
                    >
                      {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <input
                      placeholder="e.g. Legs Day"
                      value={act.name}
                      onChange={(e) => updateActivity(i, { name: e.target.value })}
                      className="flex-1 bg-transparent border-b border-[var(--border)] text-[var(--text)] text-sm px-2 py-1 outline-none focus:border-accent"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={act.minutes}
                        onChange={(e) => updateActivity(i, { minutes: parseInt(e.target.value) || 0 })}
                        className="w-16 bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-xs rounded-lg px-2 py-1 outline-none text-center"
                      />
                      <span className="text-[10px] font-bold text-[var(--muted)]">min</span>
                    </div>
                    <button onClick={() => removeActivity(i)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"><X size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sleep Slots */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-widest opacity-60">Sleep Slots</label>
              <button onClick={addSleepSlot} className="text-xs flex items-center gap-1 text-accent hover:opacity-80 transition-all font-bold">
                <Plus size={14} /> Add Slot
              </button>
            </div>
            <div className="flex flex-wrap gap-4">
              {sleepSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 bg-[var(--surface2)] px-4 py-3 rounded-2xl border border-[var(--border)] group animate-in fade-in duration-300">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--muted)] uppercase">Start</span>
                    <input 
                      type="time"
                      value={slot.start}
                      onChange={(e) => updateSleepSlot(i, { start: e.target.value })}
                      className="bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-lg px-2 py-1 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div className="w-4 h-[1px] bg-[var(--border)]" />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--muted)] uppercase">End</span>
                    <input 
                      type="time"
                      value={slot.end}
                      onChange={(e) => updateSleepSlot(i, { end: e.target.value })}
                      className="bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-lg px-2 py-1 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  {sleepSlots.length > 1 && (
                    <button onClick={() => removeSleepSlot(i)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Productivity Scores */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex justify-between">
                Productivity <span>{productivity}/10</span>
              </label>
              <input type="range" min="1" max="10" value={productivity} onChange={(e) => setProductivity(parseInt(e.target.value))} className="w-full" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex justify-between">
                Focus <span>{focus}/10</span>
              </label>
              <input type="range" min="1" max="10" value={focus} onChange={(e) => setFocus(parseInt(e.target.value))} className="w-full" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex justify-between">
                Laziness <span>{laziness}/10</span>
              </label>
              <input type="range" min="1" max="10" value={laziness} onChange={(e) => setLaziness(parseInt(e.target.value))} className="w-full" />
            </div>
          </div>

          {/* Outcome */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">Day Outcome / Thoughts</label>
            <textarea
              placeholder="How was your day? Any major wins or blockers?"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] p-4 rounded-2xl min-h-[120px] outline-none focus:border-accent transition-all resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex gap-3 sticky bottom-0 pt-4 bg-transparent backdrop-blur-md">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-[2] py-3 rounded-xl font-bold text-sm bg-accent text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent/20"
          >
            {isSaving ? "Saving..." : (
              <>
                {isUpdate ? <RefreshCw size={18} /> : <Save size={18} />}
                {isUpdate ? "Update Summary" : "Save Summary"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
