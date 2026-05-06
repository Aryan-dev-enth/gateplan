import weeklyPlanData from "@/lib/weeklyPlan.json";
import { loadCourses } from "@/lib/courseLoader";
import { extendWeeklyPlan } from "@/lib/weeklyPlanExtender";
import WeeklyClient from "./WeeklyClient";
import type { WeekData } from "@/lib/backlog";

export type { TaskData, DayData, WeekData } from "@/lib/backlog";

export default function WeeklyPage() {
  const subjects = loadCourses();
  const extendedWeeks = extendWeeklyPlan(weeklyPlanData as WeekData[]);
  return <WeeklyClient weeks={extendedWeeks} subjects={subjects} />;
}
