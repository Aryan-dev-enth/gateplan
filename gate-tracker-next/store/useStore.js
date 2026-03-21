'use client';
import { create } from 'zustand';
import { SUBJECTS, SLOTS } from '@/data/subjects';
import { DAILY_PLAN } from '@/data/dailyPlan';
import { format, addDays, differenceInCalendarDays } from 'date-fns';

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

const initTopicStats = () => {
  const stats = {};
  SUBJECTS.forEach(s => s.topics.forEach(t => {
    stats[t.id] = { done: false, hoursSpent: 0, pyqSolved: 0, pyqCorrect: 0, practiceSolved: 0, practiceCorrect: 0 };
  }));
  return stats;
};

const initSubjectStats = () => {
  const stats = {};
  SUBJECTS.forEach(s => { stats[s.id] = { hoursSpent: 0 }; });
  return stats;
};

// ── UNDO STACK (in-memory only) ───────────────────────────────────────────
// Stores snapshots of the fields that were changed so we can revert
let undoStack = []; // [{snapshot, label, ts}]
const MAX_UNDO = 20;

function pushUndo(label, snapshot) {
  undoStack = [{ label, snapshot, ts: Date.now() }, ...undoStack].slice(0, MAX_UNDO);
}

// ── DB SYNC ─────────────────────────────────────────────────────────────────
// Debounced — batches rapid changes into one write
let saveTimer = null;
function scheduleSave(getState) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const s = getState();
    if (!s.token) return;
    fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.token}` },
      body: JSON.stringify({
        topicStats: s.topicStats,
        subjectStats: s.subjectStats,
        dailyLogs: s.dailyLogs,
        dailyHours: s.dailyHours,
        customSlotAssignments: s.customSlotAssignments,
        practiceLog: s.practiceLog,
        backlog: s.backlog,
        mockTests: s.mockTests,
        streak: s.streak,
        weeklyTarget: s.weeklyTarget,
      }),
    }).catch(console.error);
  }, 600);
}

// ── SMART MISSED-DAY RESCHEDULE ──────────────────────────────────────────────
// Finds all missed slots between lastActiveDate and today,
// then spreads them across the next N days (up to 3) without overwriting existing planned slots.
function buildSmartReschedule(state) {
  const today = todayStr();
  const studiedDates = new Set(state.streak.studiedDates || []);
  const allDates = Object.keys(DAILY_PLAN).sort();
  const missed = [];

  // Collect missed dates that have planned content and were not studied
  for (const date of allDates) {
    if (date >= today) break; // only past dates
    if (studiedDates.has(date)) continue;
    const slots = SLOTS.map(sl => ({
      ...sl,
      planned: state.customSlotAssignments[date]?.[sl.id] ?? DAILY_PLAN[date]?.[sl.id] ?? '',
    }));
    const logs = state.dailyLogs[date] || {};
    slots.forEach(sl => {
      if (sl.planned && !logs[sl.id]?.completed) {
        missed.push({ task: sl.planned, originalDate: date, slotId: sl.id, priority: 'High' });
      }
    });
  }

  if (!missed.length) return null;

  // Spread across next 3 upcoming days that have room
  const rescheduleMap = {}; // date -> [tasks]
  let dayOffset = 1;
  let missedIdx = 0;

  while (missedIdx < missed.length && dayOffset <= 7) {
    const targetDate = format(addDays(new Date(today + 'T12:00:00'), dayOffset), 'yyyy-MM-dd');
    // How many extra tasks can we add today? Cap at 2 extra per day
    const existing = rescheduleMap[targetDate]?.length || 0;
    if (existing < 2) {
      if (!rescheduleMap[targetDate]) rescheduleMap[targetDate] = [];
      rescheduleMap[targetDate].push(missed[missedIdx]);
      missedIdx++;
    } else {
      dayOffset++;
    }
    if (existing >= 2) dayOffset++;
  }

  return { rescheduleMap, remaining: missed.slice(missedIdx) };
}

const useStore = create((set, get) => ({
  // ── AUTH ──────────────────────────────────────────────────────────────────
  token: null,
  username: null,
  loading: false,

  login: async (username, password) => {
    set({ loading: true });
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', username, password }),
    });
    const data = await res.json();
    if (!res.ok) { set({ loading: false }); return { error: data.error }; }
    sessionStorage.setItem('gate_token', data.token);
    sessionStorage.setItem('gate_user', data.username);
    set({ token: data.token, username: data.username, loading: false });
    await get().fetchUserData();
    return {};
  },

  register: async (username, password) => {
    set({ loading: true });
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', username, password }),
    });
    const data = await res.json();
    if (!res.ok) { set({ loading: false }); return { error: data.error }; }
    sessionStorage.setItem('gate_token', data.token);
    sessionStorage.setItem('gate_user', data.username);
    set({ token: data.token, username: data.username, loading: false });
    await get().fetchUserData();
    return {};
  },

  logout: () => {
    sessionStorage.removeItem('gate_token');
    sessionStorage.removeItem('gate_user');
    set({ token: null, username: null, ...get()._defaultData() });
  },

  restoreSession: async () => {
    const token = sessionStorage.getItem('gate_token');
    const username = sessionStorage.getItem('gate_user');
    if (!token) return;
    set({ token, username });
    await get().fetchUserData();
  },

  fetchUserData: async () => {
    const { token } = get();
    if (!token) return;
    const res = await fetch('/api/user', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    set({
      topicStats: data.topicStats && Object.keys(data.topicStats).length ? data.topicStats : initTopicStats(),
      subjectStats: data.subjectStats && Object.keys(data.subjectStats).length ? data.subjectStats : initSubjectStats(),
      dailyLogs: data.dailyLogs || {},
      dailyHours: data.dailyHours || {},
      customSlotAssignments: data.customSlotAssignments || {},
      practiceLog: data.practiceLog || {},
      backlog: data.backlog || [],
      mockTests: data.mockTests || [],
      streak: data.streak || { current: 0, longest: 0, lastStudyDate: null, studiedDates: [] },
      weeklyTarget: data.weeklyTarget || 45,
    });
    // After loading, run missed-day detection
    get().runMissedDayDetection();
  },

  _defaultData: () => ({
    topicStats: initTopicStats(), subjectStats: initSubjectStats(),
    dailyLogs: {}, dailyHours: {}, customSlotAssignments: {},
    practiceLog: {}, backlog: [], mockTests: [],
    streak: { current: 0, longest: 0, lastStudyDate: null, studiedDates: [] },
    weeklyTarget: 45,
  }),

  // ── UI ────────────────────────────────────────────────────────────────────
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  // ── STUDY DATA ────────────────────────────────────────────────────────────
  topicStats: initTopicStats(),
  subjectStats: initSubjectStats(),
  dailyLogs: {},
  dailyHours: {},
  customSlotAssignments: {},
  practiceLog: {},
  backlog: [],
  mockTests: [],
  streak: { current: 0, longest: 0, lastStudyDate: null, studiedDates: [] },
  weeklyTarget: 45,

  // ── TIMERS (in-memory only, no DB needed) ─────────────────────────────────
  timers: {},
  startTimer: (slotId) => set(s => ({
    timers: { ...s.timers, [slotId]: { running: true, startedAt: Date.now(), elapsed: s.timers[slotId]?.elapsed || 0 } },
  })),
  stopTimer: (slotId) => set(s => {
    const t = s.timers[slotId];
    if (!t?.running) return {};
    return { timers: { ...s.timers, [slotId]: { running: false, startedAt: null, elapsed: t.elapsed + (Date.now() - t.startedAt) } } };
  }),
  resetTimer: (slotId) => set(s => ({ timers: { ...s.timers, [slotId]: { running: false, startedAt: null, elapsed: 0 } } })),
  getElapsed: (slotId) => {
    const t = get().timers[slotId];
    if (!t) return 0;
    return t.running ? t.elapsed + (Date.now() - t.startedAt) : t.elapsed;
  },

  // ── HELPERS ───────────────────────────────────────────────────────────────
  getPlannedSlots: (date) => {
    const plan = DAILY_PLAN[date] || {};
    const custom = get().customSlotAssignments[date] || {};
    return SLOTS.map(slot => ({ ...slot, planned: custom[slot.id] ?? plan[slot.id] ?? '' }));
  },

  // ── DAILY LOG — progress ACCUMULATES, never overwrites ───────────────────
  // Each save adds the NEW hours/questions on top of what was already stored.
  // We track `lastSavedHours` and `lastSavedQuestions` per slot so re-saves
  // only add the delta, not the full amount again.
  logSlot: (date, slotId, { topic, questions, notes, hoursStudied }) => {
    set(s => {
      const prev = s.dailyLogs[date]?.[slotId] || {};

      // Delta hours: new elapsed minus what was already credited
      const prevHours = prev.hoursStudied || 0;
      const deltaHours = Math.max(0, (hoursStudied || 0) - prevHours);

      // Delta questions: new total minus what was already credited
      const prevQ = prev.questions || 0;
      const deltaQ = Math.max(0, (questions || 0) - prevQ);

      const updatedLog = {
        ...prev,
        topic: topic || prev.topic,
        notes: notes !== undefined ? notes : prev.notes,
        hoursStudied: hoursStudied || prevHours,
        questions: questions || prevQ,
      };

      // Update dailyHours
      const newDailyHours = {
        ...s.dailyHours,
        [date]: (s.dailyHours[date] || 0) + deltaHours,
      };

      // Update topicStats — accumulate hours and questions
      let newTopicStats = { ...s.topicStats };
      let newSubjectStats = { ...s.subjectStats };
      const topicId = topic || prev.topic;

      if (topicId && deltaHours > 0) {
        const subj = SUBJECTS.find(sub => sub.topics.find(t => t.id === topicId));
        if (subj) {
          newTopicStats = {
            ...newTopicStats,
            [topicId]: { ...newTopicStats[topicId], hoursSpent: (newTopicStats[topicId]?.hoursSpent || 0) + deltaHours },
          };
          newSubjectStats = {
            ...newSubjectStats,
            [subj.id]: { hoursSpent: (newSubjectStats[subj.id]?.hoursSpent || 0) + deltaHours },
          };
        }
      }

      return {
        dailyLogs: { ...s.dailyLogs, [date]: { ...s.dailyLogs[date], [slotId]: updatedLog } },
        dailyHours: newDailyHours,
        topicStats: newTopicStats,
        subjectStats: newSubjectStats,
      };
    });
    scheduleSave(get);
  },

  markSlotComplete: (date, slotId) => {
    set(s => ({
      dailyLogs: {
        ...s.dailyLogs,
        [date]: { ...s.dailyLogs[date], [slotId]: { ...s.dailyLogs[date]?.[slotId], completed: true } },
      },
    }));
    get().checkAndUpdateStreak(date);
    scheduleSave(get);
  },

  assignSlot: (date, slotId, text) => {
    set(s => ({
      customSlotAssignments: { ...s.customSlotAssignments, [date]: { ...s.customSlotAssignments[date], [slotId]: text } },
    }));
    scheduleSave(get);
  },

  // ── TOPIC STATS ───────────────────────────────────────────────────────────
  markTopicDone: (topicId, done) => {
    set(s => ({ topicStats: { ...s.topicStats, [topicId]: { ...s.topicStats[topicId], done } } }));
    scheduleSave(get);
  },

  // Direct question logging (from SubjectTracker / QuestionTracker)
  // Always ADDS to existing counts — never replaces
  logQuestions: (topicId, type, solved, correct) => {
    set(s => {
      const prev = s.topicStats[topicId] || {};
      const sk = type === 'pyq' ? 'pyqSolved' : 'practiceSolved';
      const ck = type === 'pyq' ? 'pyqCorrect' : 'practiceCorrect';
      return {
        topicStats: {
          ...s.topicStats,
          [topicId]: { ...prev, [sk]: (prev[sk] || 0) + solved, [ck]: (prev[ck] || 0) + correct },
        },
      };
    });
    scheduleSave(get);
  },

  // ── MISSED DAY SMART RESCHEDULE ───────────────────────────────────────────
  // Called on login/load. Detects missed days and adds them to backlog
  // with intelligent rescheduling spread across next few days.
  runMissedDayDetection: () => {
    const s = get();
    const today = todayStr();
    const studiedDates = new Set(s.streak.studiedDates || []);
    const existingBacklogIds = new Set(s.backlog.map(b => b.id));
    const newBacklogItems = [];

    // Look at all planned dates in the past
    for (const date of Object.keys(DAILY_PLAN).sort()) {
      if (date >= today) break;
      const slots = SLOTS.map(sl => ({
        ...sl,
        planned: s.customSlotAssignments[date]?.[sl.id] ?? DAILY_PLAN[date]?.[sl.id] ?? '',
      }));
      const logs = s.dailyLogs[date] || {};
      const dayHasAnyCompletion = slots.some(sl => logs[sl.id]?.completed);

      slots.forEach(sl => {
        if (!sl.planned) return;
        if (logs[sl.id]?.completed) return;
        const id = `${date}-${sl.id}`;
        if (existingBacklogIds.has(id)) return;

        // Smart priority: more recent missed = higher priority
        const daysAgo = differenceInCalendarDays(new Date(today + 'T12:00:00'), new Date(date + 'T12:00:00'));
        const priority = daysAgo <= 2 ? 'High' : daysAgo <= 5 ? 'Medium' : 'Low';

        // Smart reschedule: spread across next 1-3 days
        const rescheduleOffset = Math.min(3, Math.ceil(newBacklogItems.length / 2) + 1);
        const rescheduledTo = format(addDays(new Date(today + 'T12:00:00'), rescheduleOffset), 'yyyy-MM-dd');

        newBacklogItems.push({
          id, date, slotId: sl.id, task: sl.planned,
          priority, rescheduledTo, addedAt: Date.now(),
          autoRescheduled: true,
        });
      });
    }

    if (newBacklogItems.length > 0) {
      set(s => ({ backlog: [...s.backlog, ...newBacklogItems] }));
      scheduleSave(get);
    }
  },

  // ── BACKLOG ───────────────────────────────────────────────────────────────
  updateBacklogPriority: (id, priority) => {
    set(s => ({ backlog: s.backlog.map(b => b.id === id ? { ...b, priority } : b) }));
    scheduleSave(get);
  },

  rescheduleBacklog: (id, newDate) => {
    set(s => ({ backlog: s.backlog.map(b => b.id === id ? { ...b, rescheduledTo: newDate, autoRescheduled: false } : b) }));
    scheduleSave(get);
  },

  resolveBacklog: (id) => {
    set(s => ({ backlog: s.backlog.filter(b => b.id !== id) }));
    scheduleSave(get);
  },

  // ── PRACTICE LOG ──────────────────────────────────────────────────────────
  addPracticeEntry: (entry) => {
    const d = todayStr();
    set(s => ({
      practiceLog: { ...s.practiceLog, [d]: [...(s.practiceLog[d] || []), { ...entry, id: Date.now() }] },
    }));
    // This also accumulates into topicStats
    get().logQuestions(entry.topicId, entry.type, entry.solved, entry.correct);
    scheduleSave(get);
  },

  // ── MOCK TESTS ────────────────────────────────────────────────────────────
  addMockTest: (test) => {
    set(s => ({ mockTests: [...s.mockTests, { ...test, id: Date.now() }] }));
    scheduleSave(get);
  },

  // ── STREAK ────────────────────────────────────────────────────────────────
  checkAndUpdateStreak: (date) => {
    set(s => {
      const studied = new Set(s.streak.studiedDates);
      studied.add(date);
      const sorted = [...studied].sort();
      let current = 1;
      for (let i = sorted.length - 1; i > 0; i--) {
        const diff = differenceInCalendarDays(new Date(sorted[i] + 'T12:00:00'), new Date(sorted[i - 1] + 'T12:00:00'));
        if (diff === 1) current++;
        else break;
      }
      const longest = Math.max(s.streak.longest, current);
      return { streak: { current, longest, lastStudyDate: date, studiedDates: sorted } };
    });
    scheduleSave(get);
  },

  markTodayStudied: () => get().checkAndUpdateStreak(todayStr()),
  setWeeklyTarget: (h) => { set({ weeklyTarget: h }); scheduleSave(get); },

  // ── UNDO ──────────────────────────────────────────────────────────────────
  // toast: { message, id } shown by AppShell
  undoToast: null,
  clearUndoToast: () => set({ undoToast: null }),

  undo: () => {
    if (!undoStack.length) return;
    const { snapshot } = undoStack.shift();
    set(snapshot);
    scheduleSave(get);
    set({ undoToast: null });
  },

  // ── DELETE SLOT LOG ───────────────────────────────────────────────────────
  // Reverses hours/questions that were accumulated when this slot was saved
  deleteSlotLog: (date, slotId) => {
    const s = get();
    const log = s.dailyLogs[date]?.[slotId];
    if (!log) return;

    // Save snapshot for undo
    pushUndo(`Slot log deleted`, {
      dailyLogs: s.dailyLogs,
      dailyHours: s.dailyHours,
      topicStats: s.topicStats,
      subjectStats: s.subjectStats,
    });

    const hoursToRemove = log.hoursStudied || 0;
    const topicId = log.topic;

    // Remove from dailyLogs
    const newDayLogs = { ...s.dailyLogs[date] };
    delete newDayLogs[slotId];
    const newDailyLogs = { ...s.dailyLogs, [date]: newDayLogs };

    // Subtract from dailyHours
    const newDailyHours = {
      ...s.dailyHours,
      [date]: Math.max(0, (s.dailyHours[date] || 0) - hoursToRemove),
    };

    // Subtract from topicStats / subjectStats
    let newTopicStats = { ...s.topicStats };
    let newSubjectStats = { ...s.subjectStats };
    if (topicId && hoursToRemove > 0) {
      const subj = SUBJECTS.find(sub => sub.topics.find(t => t.id === topicId));
      if (subj) {
        newTopicStats = {
          ...newTopicStats,
          [topicId]: { ...newTopicStats[topicId], hoursSpent: Math.max(0, (newTopicStats[topicId]?.hoursSpent || 0) - hoursToRemove) },
        };
        newSubjectStats = {
          ...newSubjectStats,
          [subj.id]: { hoursSpent: Math.max(0, (newSubjectStats[subj.id]?.hoursSpent || 0) - hoursToRemove) },
        };
      }
    }

    set({ dailyLogs: newDailyLogs, dailyHours: newDailyHours, topicStats: newTopicStats, subjectStats: newSubjectStats,
      undoToast: { message: 'Slot log deleted', id: Date.now() } });
    scheduleSave(get);
  },

  // ── DELETE PRACTICE ENTRY ─────────────────────────────────────────────────
  deletePracticeEntry: (date, entryId) => {
    const s = get();
    const entries = s.practiceLog[date] || [];
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    pushUndo('Practice entry deleted', {
      practiceLog: s.practiceLog,
      topicStats: s.topicStats,
    });

    // Remove entry
    const newEntries = entries.filter(e => e.id !== entryId);
    const newPracticeLog = { ...s.practiceLog, [date]: newEntries };

    // Reverse topicStats accumulation
    const sk = entry.type === 'pyq' ? 'pyqSolved' : 'practiceSolved';
    const ck = entry.type === 'pyq' ? 'pyqCorrect' : 'practiceCorrect';
    const prev = s.topicStats[entry.topicId] || {};
    const newTopicStats = {
      ...s.topicStats,
      [entry.topicId]: {
        ...prev,
        [sk]: Math.max(0, (prev[sk] || 0) - entry.solved),
        [ck]: Math.max(0, (prev[ck] || 0) - entry.correct),
      },
    };

    set({ practiceLog: newPracticeLog, topicStats: newTopicStats,
      undoToast: { message: 'Practice entry deleted', id: Date.now() } });
    scheduleSave(get);
  },

  // ── DELETE QUESTION LOG (from SubjectTracker inline log) ──────────────────
  deleteQuestions: (topicId, type, solved, correct) => {
    const s = get();
    pushUndo('Question log deleted', { topicStats: s.topicStats });

    const sk = type === 'pyq' ? 'pyqSolved' : 'practiceSolved';
    const ck = type === 'pyq' ? 'pyqCorrect' : 'practiceCorrect';
    const prev = s.topicStats[topicId] || {};
    set({
      topicStats: {
        ...s.topicStats,
        [topicId]: {
          ...prev,
          [sk]: Math.max(0, (prev[sk] || 0) - solved),
          [ck]: Math.max(0, (prev[ck] || 0) - correct),
        },
      },
      undoToast: { message: 'Question log deleted', id: Date.now() },
    });
    scheduleSave(get);
  },

  // ── DELETE MOCK TEST ──────────────────────────────────────────────────────
  deleteMockTest: (id) => {
    const s = get();
    pushUndo('Mock test deleted', { mockTests: s.mockTests });
    set({ mockTests: s.mockTests.filter(t => t.id !== id),
      undoToast: { message: 'Mock test deleted', id: Date.now() } });
    scheduleSave(get);
  },

  // ── UNMARK SLOT COMPLETE ──────────────────────────────────────────────────
  unmarkSlotComplete: (date, slotId) => {
    const s = get();
    pushUndo('Completion undone', { dailyLogs: s.dailyLogs, streak: s.streak });
    set(st => ({
      dailyLogs: {
        ...st.dailyLogs,
        [date]: { ...st.dailyLogs[date], [slotId]: { ...st.dailyLogs[date]?.[slotId], completed: false } },
      },
      undoToast: { message: 'Marked incomplete', id: Date.now() },
    }));
    scheduleSave(get);
  },
}));

export default useStore;
