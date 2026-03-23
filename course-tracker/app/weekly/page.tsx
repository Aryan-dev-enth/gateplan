import weeklyPlanData from "@/lib/weeklyPlan.json";
import { loadCourses } from "@/lib/courseLoader";
import WeeklyClient from "./WeeklyClient";

export default function WeeklyPage() {
  const subjects = loadCourses();
  return <WeeklyClient weeks={weeklyPlanData as WeekData[]} subjects={subjects} />;
}

export interface TaskData {
  subject: string;
  module: string;
  lectureRefs: string[];
  hours: number;
  lectureIds: string[];
}

export interface DayData {
  date: string;
  label: string;
  tasks: TaskData[];
}

export interface WeekData {
  weekId: string;
  label: string;
  days: DayData[];
}
