import weeklyPlanData from "@/lib/weeklyPlan.json";
import { loadCourses } from "@/lib/courseLoader";
import BacklogClient from "./BacklogClient";
import type { WeekData } from "@/app/weekly/page";

export default function BacklogPage() {
  const subjects = loadCourses();
  return <BacklogClient weeks={weeklyPlanData as WeekData[]} subjects={subjects} />;
}
