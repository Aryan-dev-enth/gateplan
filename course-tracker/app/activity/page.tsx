import { Suspense } from "react";
import { loadCourses } from "@/lib/courseLoader";
import weeklyPlanData from "@/lib/weeklyPlan.json";
import { extendWeeklyPlan } from "@/lib/weeklyPlanExtender";
import type { WeekData } from "@/app/weekly/page";
import ActivityClient from "./ActivityClient";

export default function ActivityPage() {
  const subjects = loadCourses();
  const extendedWeeks = extendWeeklyPlan(weeklyPlanData as WeekData[]);
  return (
    <Suspense>
      <ActivityClient subjects={subjects} weeks={extendedWeeks} />
    </Suspense>
  );
}
