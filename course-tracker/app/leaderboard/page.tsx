import { loadCourses } from "@/lib/courseLoader";
import weeklyPlanData from "@/lib/weeklyPlan.json";
import { extendWeeklyPlan } from "@/lib/weeklyPlanExtender";
import LeaderboardClient from "./LeaderboardClient";
import type { WeekData } from "@/app/weekly/page";

export default function LeaderboardPage() {
  const subjects = loadCourses();
  const extendedWeeks = extendWeeklyPlan(weeklyPlanData as WeekData[]);
  return <LeaderboardClient subjects={subjects} weeks={extendedWeeks} />;
}
