"use client";
import React, { useState, useEffect } from "react";
import { X, Moon, Dumbbell, Activity, Users, Plus, Trash2, Save, Smile, Frown, Meh, Zap, Battery, Flame, Rocket, CheckCircle2, Calendar, ChevronDown, Sparkles, BookOpen, RefreshCw, Target, Utensils, Clock } from "lucide-react";
import { DailySummary, Activity as ActivityType, SleepSlot, calculateFatigue, Meal, getUser } from "@/lib/store";
import CustomDatePicker from "./CustomDatePicker";

interface DailySummaryFormProps {
  username: string;
  initialDate?: string;
  initialSummaries?: DailySummary[];
  onSave: (summary: DailySummary) => Promise<any>;
  onClose?: () => void;
  isPage?: boolean;
  mode?: "quick" | "eod" | "full";
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

export default function DailySummaryForm({ username, initialDate, initialSummaries, onSave, onClose, isPage, mode = "full" }: DailySummaryFormProps) {
  const [date, setDate] = useState(initialDate || new Date().toISOString().split("T")[0]);
  const [studyHours, setStudyHours] = useState(0);
  const [lectureHours, setLectureHours] = useState(0);
  const [sessionHours, setSessionHours] = useState(0);
  const [studyType, setStudyType] = useState<DailySummary["type"]>("study");
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [sleepSlots, setSleepSlots] = useState<SleepSlot[]>([{ start: "23:00", end: "07:00" }]);
  const [productivity, setProductivity] = useState(5);
  const [focus, setFocus] = useState(5);
  const [laziness, setLaziness] = useState(5);
  const [studyQuality, setStudyQuality] = useState(5);
  const [screenTime, setScreenTime] = useState(2);
  const [habits, setHabits] = useState<string[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [sleepyTimes, setSleepyTimes] = useState<string[]>([]);
  const [outcome, setOutcome] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);

  const HABITS = [
    { id: "morning_routine", label: "Morning Routine", icon: Sparkles, color: "#6366f1" },
    { id: "planning", label: "Day Planning", icon: Calendar, color: "#a855f7" },
    { id: "healthy_meals", label: "Healthy Meals", icon: Flame, color: "#f97316" },
    { id: "deep_work", label: "Deep Work Sess", icon: Rocket, color: "#ec4899" },
    { id: "screen_limit", label: "Screen Limit", icon: Zap, color: "#eab308" },
    { id: "exercise", label: "Physical Activity", icon: Dumbbell, color: "#22c55e" },
  ];

  useEffect(() => {
    if (!initialSummaries) return;
    const existing = initialSummaries.find((s: DailySummary) => s.date === date);
    if (existing) {
      setStudyHours(existing.studyHours || 0);
      setLectureHours(existing.lectureHours || 0);
      setSessionHours(existing.sessionHours || 0);
      setStudyType(existing.type || "study");
      setActivities(existing.activities || []);
      setSleepSlots(existing.sleepSlots || [{ start: "23:00", end: "07:00" }]);
      setProductivity(existing.scores?.productivity || 5);
      setFocus(existing.scores?.focus || 5);
      setLaziness(existing.scores?.laziness || 5);
      setStudyQuality(existing.studyQuality || 5);
      setScreenTime(existing.screenTime || 2);
      setHabits(existing.habits || []);
      setMeals(existing.meals || []);
      setSleepyTimes(existing.sleepyTimes || []);
      setOutcome(existing.outcome || "");
      setIsUpdate(true);
    }
  }, [date, initialSummaries]);

  const toggleHabit = (id: string) => setHabits(prev => prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]);
  const addMeal = () => setMeals([...meals, { name: "", calories: 500, protein: 30, carbs: 50, fat: 15, time: "13:00" }]);
  const updateMeal = (index: number, updates: Partial<Meal>) => {
    const newMeals = [...meals];
    newMeals[index] = { ...newMeals[index], ...updates };
    setMeals(newMeals);
  };
  const removeMeal = (index: number) => setMeals(meals.filter((_, i) => i !== index));
  const addSleepyTime = () => setSleepyTimes([...sleepyTimes, "15:00"]);
  const updateSleepyTime = (index: number, val: string) => {
    const newTimes = [...sleepyTimes];
    newTimes[index] = val;
    setSleepyTimes(newTimes);
  };
  const removeSleepyTime = (index: number) => setSleepyTimes(sleepyTimes.filter((_, i) => i !== index));
  const addActivity = () => setActivities([...activities, { name: "", minutes: 30, type: "gym", intensity: 3 }]);
  const removeActivity = (index: number) => setActivities(activities.filter((_, i) => i !== index));
  const updateActivity = (index: number, updates: Partial<ActivityType>) => {
    const newActivities = [...activities];
    newActivities[index] = { ...newActivities[index], ...updates };
    setActivities(newActivities);
  };
  const addSleepSlot = () => setSleepSlots([...sleepSlots, { start: "23:00", end: "07:00" }]);
  const removeSleepSlot = (index: number) => setSleepSlots(sleepSlots.filter((_, i) => i !== index));
  const updateSleepSlot = (index: number, updates: Partial<SleepSlot>) => {
    const newSlots = [...sleepSlots];
    newSlots[index] = { ...newSlots[index], ...updates };
    setSleepSlots(newSlots);
  };

  const syncStudyTime = async () => {
    try {
      const data = await getUser(username);
      const formDateStr = new Date(date).toDateString();
      
      // 1. Durations from specialized study sessions
      const matchedSessions = (data.studySessions || []).filter(s => 
        new Date(s.startedAt).toDateString() === formDateStr
      );
      const sMinutes = matchedSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
      const sHours = parseFloat((sMinutes / 60).toFixed(1));

      // 2. Durations from ticked lectures (Estimate: 60m per lecture)
      let lMinutes = 0;
      if (data.manualLectureRefs) {
        Object.keys(data.manualLectureRefs).forEach(key => {
          if (key.startsWith(date)) {
            lMinutes += 60;
          }
        });
      }
      const lHours = parseFloat((lMinutes / 60).toFixed(1));

      setSessionHours(sHours);
      setLectureHours(lHours);
      setStudyHours(parseFloat((sHours + lHours).toFixed(1)));
    } catch (e) {
      console.error("Failed to sync study time", e);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const summary: DailySummary = {
      date, studyHours, lectureHours, sessionHours, type: studyType, activities, sleepSlots, 
      scores: { productivity, focus, laziness }, outcome, habits, 
      screenTime, studyQuality, meals, sleepyTimes
    };
    summary.fatigue = calculateFatigue(summary);
    try {
      await onSave(summary);
      if (onClose) onClose();
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  return (
    <div className={isPage ? "w-full" : "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"}>
      <div className={`${isPage ? "" : "glass w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"} flex flex-col`}>
        <div className="p-6 sm:p-10 space-y-10">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tighter grad-text">
                {mode === "quick" ? "Quick Log Tracker" : mode === "eod" ? "End of Day Summary" : "Daily Wellness Log"}
              </h2>
              <div className="flex items-center gap-2 opacity-50">
                <Calendar size={14} />
                <p className="text-sm font-medium">{new Date(date).toDateString()}</p>
              </div>
            </div>
            {!isPage && onClose && (
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all text-[var(--muted)] hover:text-[var(--text)]">
                <X size={24} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-12">
            {/* Mode: Quick or Full -> Nutrition, Activities, Sleepy Times */}
            {(mode === "quick" || mode === "full") && (
              <>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-widest opacity-60 flex items-center gap-2"><Utensils size={14}/> Nutrition & Macros</label>
                    <button onClick={addMeal} className="text-xs flex items-center gap-1 text-accent font-bold hover:opacity-80"><Plus size={14} /> Add Meal</button>
                  </div>
                  <div className="space-y-3">
                    {meals.map((meal, i) => (
                      <div key={i} className="bg-[var(--surface2)] p-4 rounded-2xl border border-[var(--border)] space-y-4">
                        <div className="flex gap-4 items-center">
                          <input type="time" value={meal.time} onChange={e => updateMeal(i, { time: e.target.value })} className="bg-[var(--surface)] text-[10px] rounded p-1 border border-[var(--border)]" />
                          <input placeholder="Meal name" value={meal.name} onChange={e => updateMeal(i, { name: e.target.value })} className="flex-1 bg-transparent border-b border-[var(--border)] text-sm px-2 outline-none" />
                          <button onClick={() => removeMeal(i)} className="text-red-400"><Trash2 size={14}/></button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="space-y-1"><label className="text-[9px] uppercase opacity-40">Calories</label><input type="number" value={meal.calories} onChange={e => updateMeal(i, { calories: Math.max(0, parseInt(e.target.value) || 0) })} className="w-full bg-[var(--surface)] text-xs rounded p-2 border border-[var(--border)]" /></div>
                          <div className="space-y-1"><label className="text-[9px] uppercase opacity-40">Protein (g)</label><input type="number" value={meal.protein} onChange={e => updateMeal(i, { protein: Math.max(0, parseInt(e.target.value) || 0) })} className="w-full bg-[var(--surface)] text-xs rounded p-2 border border-[var(--border)]" /></div>
                          <div className="space-y-1"><label className="text-[9px] uppercase opacity-40">Carbs (g)</label><input type="number" value={meal.carbs} onChange={e => updateMeal(i, { carbs: Math.max(0, parseInt(e.target.value) || 0) })} className="w-full bg-[var(--surface)] text-xs rounded p-2 border border-[var(--border)]" /></div>
                          <div className="space-y-1"><label className="text-[9px] uppercase opacity-40">Fat (g)</label><input type="number" value={meal.fat} onChange={e => updateMeal(i, { fat: Math.max(0, parseInt(e.target.value) || 0) })} className="w-full bg-[var(--surface)] text-xs rounded p-2 border border-[var(--border)]" /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-widest opacity-60 flex items-center gap-2"><Dumbbell size={14}/> Training & Work</label>
                    <button onClick={addActivity} className="text-xs flex items-center gap-1 text-accent font-bold hover:opacity-80"><Plus size={14} /> Add Session</button>
                  </div>
                  <div className="space-y-3">
                    {activities.map((act, i) => (
                      <div key={i} className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border)] space-y-4 group">
                        <div className="flex gap-3 items-center">
                          <select value={act.type} onChange={(e) => updateActivity(i, { type: e.target.value as any })} className="bg-[var(--surface2)] border border-[var(--border)] text-xs rounded-lg px-2 py-2 outline-none">
                            {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          <input placeholder="e.g. Morning Run" value={act.name} onChange={(e) => updateActivity(i, { name: e.target.value })} className="flex-1 bg-transparent border-b border-[var(--border)] text-sm px-2 py-1 outline-none focus:border-accent" />
                          <button onClick={() => removeActivity(i)} className="text-red-400 group-hover:opacity-100 opacity-0 transition-opacity"><Trash2 size={16}/></button>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2"><span className="text-[10px] font-bold opacity-40">DURATION</span><input type="number" value={act.minutes} onChange={(e) => updateActivity(i, { minutes: parseInt(e.target.value) || 0 })} className="w-16 bg-[var(--surface2)] text-xs rounded-lg px-2 py-1 outline-none text-center" /></div>
                          <div className="flex items-center gap-2 flex-1"><span className="text-[10px] font-bold opacity-40">INTENSITY</span><input type="range" min="1" max="5" value={act.intensity || 3} onChange={(e) => updateActivity(i, { intensity: parseInt(e.target.value) })} className="flex-1 accent-orange-500" /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center"><label className="text-xs font-bold uppercase tracking-widest opacity-60 flex items-center gap-2"><Clock size={14}/> Energy Dips</label><button onClick={addSleepyTime} className="text-xs text-accent font-bold hover:opacity-80"><Plus size={14} /> Add Dip</button></div>
                  <div className="flex flex-wrap gap-2">
                    {sleepyTimes.map((time, i) => (
                      <div key={i} className="flex items-center gap-2 bg-[var(--surface2)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                        <input type="time" value={time} onChange={e => updateSleepyTime(i, e.target.value)} className="bg-transparent text-xs outline-none" />
                        <button onClick={() => removeSleepyTime(i)} className="text-red-400/50 hover:text-red-400"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Mode: EOD or Full -> Performance, Sleep Slots, Outcome, Habits, Screen Time */}
            {(mode === "eod" || mode === "full") && (
              <>
                <div className="space-y-6 bg-accent/5 p-6 rounded-3xl border border-accent/10">
                  <label className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2"><Target size={14} /> Performance Analysis</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold opacity-60">Study Duration</span>
                        <div className="flex items-center gap-3">
                           <button 
                              onClick={syncStudyTime}
                              className="text-[9px] font-black uppercase text-accent hover:underline flex items-center gap-1"
                           >
                              <RefreshCw size={10} /> Sync from Data
                           </button>
                           <span className="text-xl font-black text-accent">{studyHours}h</span>
                        </div>
                      </div>
                      <input type="range" min="0" max="16" step="0.5" value={studyHours} onChange={(e) => setStudyHours(parseFloat(e.target.value))} className="w-full accent-accent h-2 bg-white/5 rounded-full appearance-none" />
                      
                      <div className="flex gap-4 pt-2">
                        <div className="flex-1 bg-white/5 p-3 rounded-2xl border border-white/5">
                           <p className="text-[9px] font-black uppercase opacity-40 mb-1">Lecture Blocks</p>
                           <p className="text-sm font-bold text-blue-400">{lectureHours}h</p>
                        </div>
                        <div className="flex-1 bg-white/5 p-3 rounded-2xl border border-white/5">
                           <p className="text-[9px] font-black uppercase opacity-40 mb-1">Manual Sessions</p>
                           <p className="text-sm font-bold text-orange-400">{sessionHours}h</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center"><span className="text-xs font-bold opacity-60">Focus Quality</span><span className="text-xl font-black text-blue-400">{focus}/10</span></div>
                      <input type="range" min="1" max="10" value={focus} onChange={(e) => setFocus(parseInt(e.target.value))} className="w-full accent-blue-500 h-2 bg-white/5 rounded-full appearance-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-60 flex items-center gap-2"><Moon size={14}/> Sleep Schedule</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sleepSlots.map((slot, i) => (
                      <div key={i} className="flex items-center justify-between bg-[var(--surface2)] p-4 rounded-2xl border border-[var(--border)]">
                        <div className="flex-1 flex justify-around items-center">
                          <input type="time" value={slot.start} onChange={e => updateSleepSlot(i, { start: e.target.value })} className="bg-transparent text-sm font-bold w-16" />
                          <span className="text-[10px] opacity-30">to</span>
                          <input type="time" value={slot.end} onChange={e => updateSleepSlot(i, { end: e.target.value })} className="bg-transparent text-sm font-bold w-16" />
                        </div>
                        <button onClick={() => removeSleepSlot(i)} className="text-red-400 opacity-30 hover:opacity-100"><Trash2 size={16}/></button>
                      </div>
                    ))}
                    <button onClick={addSleepSlot} className="border-2 border-dashed border-white/5 rounded-2xl p-4 text-xs opacity-40 hover:opacity-100 font-bold transition-all"><Plus size={14} className="inline mr-1"/> Add Sleep Slot</button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-60">Daily Outcome</label>
                  <textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Main achievements or lessons..." className="w-full h-32 bg-[var(--surface2)] border border-[var(--border)] rounded-2xl p-4 text-sm outline-none focus:border-accent resize-none" />
                </div>

                {/* Habits, Screen Time moved here to avoid redundancy in Quick Log */}
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-60">Habits Consistency</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {HABITS.map(h => (
                       <button key={h.id} onClick={() => toggleHabit(h.id)} className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all gap-2 ${habits.includes(h.id) ? "border-accent bg-accent/5" : "border-white/5 opacity-40 hover:opacity-60"}`}>
                          <h.icon size={18} style={{ color: h.color }} />
                          <span className="text-[9px] font-black uppercase">{h.label}</span>
                       </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5">
                  <div className="flex justify-between items-center"><label className="text-xs font-bold uppercase tracking-widest opacity-60">Activity Intensity/ScreenTime</label><span className="text-sm font-bold text-orange-400">{screenTime}h</span></div>
                  <input type="range" min="0" max="12" step="0.5" value={screenTime} onChange={(e) => setScreenTime(parseFloat(e.target.value))} className="w-full accent-orange-500" />
                </div>
              </>
            )}

            <button onClick={handleSave} disabled={isSaving} className="w-full py-4 bg-accent text-white rounded-2xl font-black text-lg shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
              {isSaving ? <RefreshCw className="animate-spin" /> : <Save />}
              {mode === "quick" ? "Log Snapshot" : mode === "eod" ? "Finalize Day" : "Save Entries"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
