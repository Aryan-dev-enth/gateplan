
export interface TaskData {
  subject: string;
  module: string;
  lectureRefs: string[];
  hours: number;
  lectureIds: string[];
}

export interface DayData {
  date: string;
  label: string;
  tasks: TaskData[];
}

export interface WeekData {
  weekId: string;
  label: string;
  days: DayData[];
}

export interface BacklogItem {
  id?: string;
  name: string;
  duration: number;
  manualKey: string;
}

export interface BacklogStructure {
  [subject: string]: {
    [module: string]: BacklogItem[];
  };
}

export interface BacklogResult {
  totalHours: number;         // Deficit hours (total)
  focusedHours: number;       // Deficit hours (not ignored)
  totalLectures: number;      // Pending lecture count
  focusedLectures: number;    // Count of pending focused lectures
  elapsedLectures: number;    // Total lectures planned up to today
  doneLectures: number;       // Completed lectures out of the elapsed set
  elapsedHours: number;       // Total hours planned up to today
  doneHours: number;          // Total hours completed out of the elapsed set (proportional)
  subjectBreakdown: Record<string, {
    totalHours: number;
    focusedHours: number;
    totalLectures: number;
    focusedLectures: number;
    elapsedHours: number;
    doneHours: number;
  }>;
  completedCatalogIds: Set<string>; // All lecture IDs identified as done (even via manual checkboxes)
  structure: BacklogStructure;
}

/**
 * Standard utility to calculate backlog metrics across the application.
 * Ensures consistent calculation of hours, lecture counts, and "Deferred" (ignored) logic.
 */
export function calculateBacklog(
  weeks: WeekData[],
  completedMap: Record<string, number | false>,
  manualLectureRefs: Record<string, number | false>,
  ignoredBacklogModules: Record<string, boolean>,
  lectureLookup?: Map<string, { lectureName: string; duration: number }>
): BacklogResult {
  const today = new Date().toISOString().split("T")[0];
  const structure: BacklogStructure = {};
  const completedCatalogIds = new Set<string>();
  
  let totalHours = 0;
  let totalLectures = 0;
  let focusedHours = 0;
  let focusedLectures = 0;
  let elapsedLectures = 0;
  let doneLectures = 0;
  let elapsedHours = 0;
  let doneHours = 0;
  const subjectBreakdown: BacklogResult["subjectBreakdown"] = {};

  const getSBreakdown = (s: string) => {
    if (!subjectBreakdown[s]) {
      subjectBreakdown[s] = { totalHours: 0, focusedHours: 0, totalLectures: 0, focusedLectures: 0, elapsedHours: 0, doneHours: 0 };
    }
    return subjectBreakdown[s];
  };

  // Pre-populate completedCatalogIds from the direct completedMap
  Object.keys(completedMap).forEach(id => {
    if (completedMap[id]) completedCatalogIds.add(id);
  });

  weeks.forEach(week => {
    week.days.forEach(day => {
      day.tasks.forEach((task, taskIdx) => {
        const tRefs = task.lectureRefs.length;
        if (tRefs > 0) {
          const pendingInThisTask: BacklogItem[] = [];
          
          task.lectureRefs.forEach((ref, i) => {
            const id = task.lectureIds?.[i];
            const manualKey = `${day.date}|${task.subject}|${task.module}|${taskIdx}|${i}|${ref}`;
            const isDone = (id && !!completedMap[id]) || !!manualLectureRefs[manualKey];

            if (isDone && id) {
              completedCatalogIds.add(id);
            }

            if (day.date <= today) {
              elapsedLectures++;
              if (isDone) {
                doneLectures++;
              } else {
                const info = (id && lectureLookup) ? lectureLookup.get(id) : null;
                pendingInThisTask.push({ 
                  id, 
                  name: info ? info.lectureName : ref, 
                  duration: info ? info.duration : 0,
                  manualKey
                });
              }
            }
          });

          if (day.date <= today) {
            const moduleKey = `${task.subject}|${task.module}`.toLowerCase();
            const isIgnored = !!ignoredBacklogModules[moduleKey];
            const sName = task.subject;
            const sb = getSBreakdown(sName);

            if (pendingInThisTask.length > 0) {
              const taskContribution = (pendingInThisTask.length / tRefs) * task.hours;
              
              totalHours += taskContribution;
              totalLectures += pendingInThisTask.length;
              elapsedHours += task.hours;
              doneHours += (task.hours - taskContribution);

              sb.totalHours += taskContribution;
              sb.totalLectures += pendingInThisTask.length;
              sb.elapsedHours += task.hours;
              sb.doneHours += (task.hours - taskContribution);
              
              if (!isIgnored) {
                focusedHours += taskContribution;
                focusedLectures += pendingInThisTask.length;
                sb.focusedHours += taskContribution;
                sb.focusedLectures += pendingInThisTask.length;
              }

              // Build structure for detailed views
              const mName = task.module;
              if (!structure[sName]) structure[sName] = {};
              if (!structure[sName][mName]) structure[sName][mName] = [];
              
              pendingInThisTask.forEach(l => {
                if (!structure[sName][mName].some(existing => existing.manualKey === l.manualKey)) {
                  structure[sName][mName].push(l);
                }
              });
            } else {
              // Task is fully done
              elapsedHours += task.hours;
              doneHours += task.hours;
              sb.elapsedHours += task.hours;
              sb.doneHours += task.hours;
            }
          }
        }
      });
    });
  });

  return { 
    totalHours,
    focusedHours,
    totalLectures,
    focusedLectures,
    elapsedLectures,
    doneLectures,
    elapsedHours,
    doneHours,
    subjectBreakdown,
    completedCatalogIds,
    structure
  };
}
