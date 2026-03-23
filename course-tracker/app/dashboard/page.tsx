import { loadCourses } from "@/lib/courseLoader";
import weeklyPlanData from "@/lib/weeklyPlan.json";
import DashboardClient from "./DashboardClient";
import type { WeekData } from "@/app/weekly/page";

export default function DashboardPage() {
  const subjects = loadCourses();
  const coreSubjects = subjects.filter((s) => s.tag !== "extra");

  // durationMap: lectureId → duration in seconds (all subjects)
  const durationMap: Record<string, number> = {};
  for (const s of subjects) {
    for (const m of s.modules) {
      for (const l of m.lectures) {
        if (l.isLecture) durationMap[l.id] = l.duration;
      }
    }
  }

  // Total lecture hours per subject (video/liveclass durations)
  const subjectTotalHours: Record<string, number> = {};
  for (const s of subjects) {
    const secs = s.modules.reduce(
      (sum, m) => sum + m.lectures.filter((l) => l.isLecture).reduce((ms, l) => ms + l.duration, 0),
      0
    );
    subjectTotalHours[s.id] = secs / 3600;
  }

  // Total hours for core subjects only
  const totalCoreHours = coreSubjects.reduce((sum, s) => sum + (subjectTotalHours[s.id] ?? 0), 0);

  // Planned hours per subject from weekly plan
  const hoursMap: Record<string, number> = {};
  for (const week of weeklyPlanData) {
    for (const day of week.days) {
      for (const task of day.tasks) {
        const key = task.subject.toLowerCase();
        hoursMap[key] = (hoursMap[key] ?? 0) + task.hours;
      }
    }
  }
  const subjectPlannedHours: Record<string, number> = {};
  for (const s of subjects) {
    subjectPlannedHours[s.id] = hoursMap[s.name.toLowerCase()] ?? 0;
  }

  return (
    <DashboardClient
      subjects={subjects}
      durationMap={durationMap}
      subjectPlannedHours={subjectPlannedHours}
      subjectTotalHours={subjectTotalHours}
      totalCoreHours={totalCoreHours}
      weeks={weeklyPlanData as WeekData[]}
    />
  );
}
