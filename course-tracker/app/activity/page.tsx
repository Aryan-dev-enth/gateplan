import { loadCourses } from "@/lib/courseLoader";
import weeklyPlanData from "@/lib/weeklyPlan.json";
import type { WeekData } from "@/app/weekly/page";
import ActivityClient from "./ActivityClient";

export default function ActivityPage() {
  const subjects = loadCourses();
  return <ActivityClient subjects={subjects} weeks={weeklyPlanData as WeekData[]} />;
}
