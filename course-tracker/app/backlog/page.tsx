import weeklyPlanData from "@/lib/weeklyPlan.json";
import { loadCourses } from "@/lib/courseLoader";
import { extendWeeklyPlan } from "@/lib/weeklyPlanExtender";
import BacklogClient from "./BacklogClient";
import type { WeekData } from "@/app/weekly/page";

export default function BacklogPage() {
  const subjects = loadCourses();
  const extendedWeeks = extendWeeklyPlan(weeklyPlanData as WeekData[]);
  return <BacklogClient weeks={extendedWeeks} subjects={subjects} />;
}
