import { Suspense } from "react";
import { loadCourses } from "@/lib/courseLoader";
import weeklyPlanData from "@/lib/weeklyPlan.json";
import type { WeekData } from "@/app/weekly/page";
import ActivityClient from "./ActivityClient";

export default function ActivityPage() {
  const subjects = loadCourses();
  return (
    <Suspense>
      <ActivityClient subjects={subjects} weeks={weeklyPlanData as WeekData[]} />
    </Suspense>
  );
}
