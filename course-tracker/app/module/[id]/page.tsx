import { loadCourses } from "@/lib/courseLoader";
import { notFound } from "next/navigation";
import weeklyPlanData from "@/lib/weeklyPlan.json";
import type { WeekData } from "@/app/weekly/page";
import ModuleClient from "./ModuleClient";

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subjects = loadCourses();

  let foundModule = null;
  let subjectId = "";
  for (const subject of subjects) {
    const mod = subject.modules.find((m) => m.id === id);
    if (mod) { foundModule = mod; subjectId = subject.id; break; }
  }

  if (!foundModule) notFound();

  const durationMap: Record<string, number> = {};
  for (const l of foundModule.lectures) {
    if (l.isLecture) durationMap[l.id] = l.duration;
  }

  return <ModuleClient module={foundModule} subjectId={subjectId} durationMap={durationMap} weeks={weeklyPlanData as WeekData[]} />;
}

export async function generateStaticParams() {
  const subjects = loadCourses();
  return subjects.flatMap((s) => s.modules.map((m) => ({ id: m.id })));
}
