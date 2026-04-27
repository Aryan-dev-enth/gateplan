import { loadCourses } from "@/lib/courseLoader";
import weeklyPlanData from "@/lib/weeklyPlan.json";
import LeaderboardClient from "./LeaderboardClient";
import type { WeekData } from "@/app/weekly/page";

export default function LeaderboardPage() {
  const subjects = loadCourses();
  return <LeaderboardClient subjects={subjects} weeks={weeklyPlanData as WeekData[]} />;
}
