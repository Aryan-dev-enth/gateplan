import { loadCourses } from "@/lib/courseLoader";
import { notFound } from "next/navigation";
import weeklyPlanData from "@/lib/weeklyPlan.json";
import { extendWeeklyPlan } from "@/lib/weeklyPlanExtender";
import type { WeekData } from "@/app/weekly/page";
import SubjectClient from "./SubjectClient";

export default async function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subjects = loadCourses();
  const subject = subjects.find((s) => s.id === id);
  if (!subject) notFound();

  const durationMap: Record<string, number> = {};
  for (const m of subject.modules) {
    for (const l of m.lectures) {
      if (l.isLecture) durationMap[l.id] = l.duration;
    }
  }

  const extendedWeeks = extendWeeklyPlan(weeklyPlanData as WeekData[]);
  return <SubjectClient subject={subject} durationMap={durationMap} weeks={extendedWeeks} />;
}

export async function generateStaticParams() {
  return loadCourses().map((s) => ({ id: s.id }));
}
