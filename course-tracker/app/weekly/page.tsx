import weeklyPlanData from "@/lib/weeklyPlan.json";
import { loadCourses } from "@/lib/courseLoader";
import WeeklyClient from "./WeeklyClient";
import type { WeekData } from "@/lib/backlog";

export type { TaskData, DayData, WeekData } from "@/lib/backlog";

export default function WeeklyPage() {
  const subjects = loadCourses();
  return <WeeklyClient weeks={weeklyPlanData as WeekData[]} subjects={subjects} />;
}
