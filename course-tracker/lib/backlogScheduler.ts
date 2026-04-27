import type { Subject } from "./courseLoader";
import type { WeekData, BacklogItem, BacklogStructure } from "./backlog";

const LECTURE_TYPES = new Set(["video", "liveclass"]);

/* ─── Types ─── */

export interface SubjectProgress {
  subjectName: string;
  color: string;
  modules: ModuleProgress[];
  totalLectures: number;
  doneLectures: number;
  pct: number;
}

export interface ModuleProgress {
  moduleId: string;
  moduleName: string;
  subjectName: string;
  totalLectures: number;
  doneLectures: number;
  pct: number;
  /** The next unwatched lectures (up to 5) */
  nextUp: { id: string; title: string; duration: number }[];
  /** Last completed lecture title */
  lastDone: string | null;
  isIgnored: boolean;
}

export interface RecommendedLecture {
  id: string;
  title: string;
  duration: number;
  subjectName: string;
  moduleName: string;
  moduleId: string;
  reason: "backlog" | "next-up" | "weekly";
}

export interface BacklogPace {
  avgDailyHours: number;
  activeDays: number;
  totalBacklogHours: number;
  daysToRecover: number | null;
  recoveryDate: Date | null;
}

export interface ScheduledDay {
  date: string;
  label: string;
  isToday: boolean;
  plannedTasks: { subject: string; name: string; hours: number }[];
  backlogTasks: (BacklogItem & { subject: string; name: string })[];
  totalHours: number;
}

export interface DynamicSchedule {
  days: ScheduledDay[];
  averagePace: number;
  completionDate: Date | null;
}

const SUBJECT_COLORS: Record<string, string> = {
  "Engineering Mathematics": "#6378ff",
  "Discrete Mathematics":    "#22d3a5",
  "Aptitude":                "#f59e0b",
  "Operating Systems":       "#f97316",
  "Computer Networks":       "#06b6d4",
  "DBMS":                    "#a78bfa",
  "Algorithms":              "#34d399",
  "Theory of Computation":   "#fb7185",
  "Digital Logic":           "#fbbf24",
  "COA":                     "#60a5fa",
  "C Programming":           "#f472b6",
};

function getColor(name: string): string {
  for (const [k, v] of Object.entries(SUBJECT_COLORS)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return "#8b5cf6";
}

/* ─── Build subject progress from courses + completedMap ─── */

export function buildSubjectProgress(
  subjects: Subject[],
  completedMap: Record<string, number | false>,
  ignoredModules: Record<string, boolean>
): SubjectProgress[] {
  return subjects
    .filter(s => s.tag === "full")
    .map(s => {
      const modules: ModuleProgress[] = s.modules.map(m => {
        const watchable = m.lectures.filter(l => LECTURE_TYPES.has(l.type));
        const done = watchable.filter(l => !!completedMap[l.id]);
        const mKey = `${s.name}|${m.name}`.toLowerCase();

        let lastDoneIdx = -1;
        for (let i = watchable.length - 1; i >= 0; i--) {
          if (!!completedMap[watchable[i].id]) { lastDoneIdx = i; break; }
        }

        const nextUp: ModuleProgress["nextUp"] = [];
        for (let i = (lastDoneIdx < 0 ? 0 : lastDoneIdx + 1); i < watchable.length && nextUp.length < 5; i++) {
          if (!completedMap[watchable[i].id]) {
            nextUp.push({ id: watchable[i].id, title: watchable[i].title, duration: watchable[i].duration });
          }
        }

        return {
          moduleId: m.id,
          moduleName: m.name,
          subjectName: s.name,
          totalLectures: watchable.length,
          doneLectures: done.length,
          pct: watchable.length > 0 ? Math.round((done.length / watchable.length) * 100) : 0,
          nextUp,
          lastDone: lastDoneIdx >= 0 ? watchable[lastDoneIdx].title : null,
          isIgnored: !!ignoredModules[mKey],
        };
      });

      const total = modules.reduce((a, m) => a + m.totalLectures, 0);
      const doneTotal = modules.reduce((a, m) => a + m.doneLectures, 0);

      return {
        subjectName: s.name,
        color: getColor(s.name),
        modules,
        totalLectures: total,
        doneLectures: doneTotal,
        pct: total > 0 ? Math.round((doneTotal / total) * 100) : 0,
      };
    })
    .filter(s => s.totalLectures > 0);
}

/* ─── Build recommendations for a given date ─── */

export function buildRecommendations(
  subjectProgress: SubjectProgress[],
  weeks: WeekData[],
  completedMap: Record<string, number | false>,
  manualRefs: Record<string, number | false>,
  focusDate: string = new Date().toISOString().split("T")[0],
  trackedModuleKeys: Set<string> = new Set(),
  maxItems: number = 20
): RecommendedLecture[] {
  const result: RecommendedLecture[] = [];
  const addedIds = new Set<string>();

  for (const week of weeks) {
    const day = week.days.find(d => d.date === focusDate);
    if (day) {
      for (let ti = 0; ti < day.tasks.length; ti++) {
        const task = day.tasks[ti];
        task.lectureRefs.forEach((ref, i) => {
          const id = task.lectureIds?.[i];
          const manualKey = `${day.date}|${task.subject}|${task.module}|${ti}|${i}|${ref}`;
          const isDone = (id && !!completedMap[id]) || !!manualRefs[manualKey];
          if (!isDone && id && !addedIds.has(id)) {
            addedIds.add(id);
            result.push({
              id, title: ref, duration: 0,
              subjectName: task.subject, moduleName: task.module,
              moduleId: "", reason: "weekly"
            });
          }
        });
      }
    }
  }

  for (const week of weeks) {
    for (const day of week.days) {
      if (day.date >= focusDate) continue;
      for (let ti = 0; ti < day.tasks.length; ti++) {
        const task = day.tasks[ti];
        task.lectureRefs.forEach((ref, i) => {
          const id = task.lectureIds?.[i];
          const manualKey = `${day.date}|${task.subject}|${task.module}|${ti}|${i}|${ref}`;
          const isDone = (id && !!completedMap[id]) || !!manualRefs[manualKey];
          if (!isDone && id && !addedIds.has(id) && result.length < maxItems) {
            addedIds.add(id);
            result.push({
              id, title: ref, duration: 0,
              subjectName: task.subject, moduleName: task.module,
              moduleId: "", reason: "backlog"
            });
          }
        });
      }
    }
  }

  for (const sp of subjectProgress) {
    for (const mod of sp.modules) {
      const mKey = `${sp.subjectName}|${mod.moduleName}`.toLowerCase();
      if (!trackedModuleKeys.has(mKey)) continue;
      for (const n of mod.nextUp) {
        if (!addedIds.has(n.id) && result.length < maxItems) {
          addedIds.add(n.id);
          result.push({
            id: n.id, title: n.title, duration: n.duration,
            subjectName: sp.subjectName, moduleName: mod.moduleName,
            moduleId: mod.moduleId, reason: "next-up"
          });
        }
      }
    }
  }

  for (const sp of subjectProgress) {
    for (const mod of sp.modules) {
      if (mod.isIgnored) continue;
      for (const n of mod.nextUp) {
        if (!addedIds.has(n.id) && result.length < maxItems) {
          addedIds.add(n.id);
          result.push({
            id: n.id, title: n.title, duration: n.duration,
            subjectName: sp.subjectName, moduleName: mod.moduleName,
            moduleId: mod.moduleId, reason: "next-up"
          });
        }
      }
    }
  }

  return result;
}

/* ─── Pace computation ─── */

export function computeBacklogPace(
  completedMap: Record<string, number | false>,
  durationMap: Map<string, number>,
  totalBacklogHours: number
): BacklogPace {
  const now = Date.now();
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

  const dailyHours: Record<string, number> = {};
  Object.entries(completedMap).forEach(([id, ts]) => {
    if (typeof ts === "number" && ts >= fourteenDaysAgo) {
      const dateKey = new Date(ts).toISOString().split("T")[0];
      const dur = (durationMap.get(id) || 5400) / 3600;
      dailyHours[dateKey] = (dailyHours[dateKey] || 0) + dur;
    }
  });

  const activeDays = Object.keys(dailyHours).length;
  const totalStudied = Object.values(dailyHours).reduce((a, b) => a + b, 0);
  const avgDailyHours = activeDays > 0 ? totalStudied / activeDays : 3.5;

  let daysToRecover: number | null = null;
  let recoveryDate: Date | null = null;
  if (totalBacklogHours > 0 && avgDailyHours > 0) {
    const extraPerDay = avgDailyHours * 0.3;
    daysToRecover = extraPerDay > 0 ? Math.ceil(totalBacklogHours / extraPerDay) : null;
    if (daysToRecover) {
      recoveryDate = new Date(now + daysToRecover * 86400000);
    }
  }

  return { avgDailyHours, activeDays, totalBacklogHours, daysToRecover, recoveryDate };
}

/* ─── Dynamic Schedule Generation for Backlog Recovery ─── */

export function generateDynamicSchedule(
  weeks: WeekData[],
  structure: BacklogStructure,
  ignoredModules: Record<string, boolean>,
  completedMap: Record<string, number | false>,
  lectureLookup: Map<string, { duration: number }>
): DynamicSchedule {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  
  const paceData = computeBacklogPace(completedMap, new Map(), 0); 
  const pace = Math.max(paceData.avgDailyHours, 3.0);
  
  const flatBacklog: (BacklogItem & { subject: string; name: string })[] = [];
  Object.entries(structure).forEach(([sName, modules]) => {
    Object.entries(modules).forEach(([mName, items]) => {
      const mKey = `${sName}|${mName}`.toLowerCase();
      if (!ignoredModules[mKey]) {
        items.forEach(item => flatBacklog.push({ ...item, subject: sName, name: item.name }));
      }
    });
  });

  const days: ScheduledDay[] = [];
  let backlogIdx = 0;
  let completionDate: Date | null = null;

  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dStr = d.toISOString().split("T")[0];
    
    const plannedTasks: ScheduledDay["plannedTasks"] = [];
    let plannedHours = 0;

    for (const week of weeks) {
      const dayData = week.days.find(wd => wd.date === dStr);
      if (dayData) {
        dayData.tasks.forEach(t => {
          plannedTasks.push({ subject: t.subject, name: t.module, hours: t.hours });
          plannedHours += t.hours;
        });
      }
    }

    const capacity = pace * 1.2;
    const room = Math.max(0, capacity - plannedHours);
    const backlogTasks: ScheduledDay["backlogTasks"] = [];
    let scheduledBacklogHours = 0;

    while (backlogIdx < flatBacklog.length && scheduledBacklogHours < room) {
      const item = flatBacklog[backlogIdx];
      const hours = (item.duration || 5400) / 3600;
      if (scheduledBacklogHours + hours <= room + 0.5) {
        backlogTasks.push(item);
        scheduledBacklogHours += hours;
        backlogIdx++;
      } else {
        break;
      }
    }

    days.push({
      date: dStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      isToday: dStr === todayStr,
      plannedTasks,
      backlogTasks,
      totalHours: plannedHours + scheduledBacklogHours
    });

    if (backlogIdx >= flatBacklog.length && !completionDate) {
      completionDate = d;
    }
  }

  if (!completionDate && flatBacklog.length > 0 && backlogIdx < flatBacklog.length) {
    const remainingHours = flatBacklog.slice(backlogIdx).reduce((a, b) => a + (b.duration || 5400) / 3600, 0);
    const dailyRecovery = pace * 0.2;
    const extraDays = dailyRecovery > 0 ? Math.ceil(remainingHours / dailyRecovery) : 30;
    completionDate = new Date(now.getTime() + (14 + extraDays) * 86400000);
  }

  return { days, averagePace: pace, completionDate };
}
