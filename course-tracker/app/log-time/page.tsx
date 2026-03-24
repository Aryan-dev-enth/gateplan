import { loadCourses } from "@/lib/courseLoader";
import LogTimeClient from "./LogTimeClient";

export default function LogTimePage() {
  const subjects = loadCourses().filter((s) => s.tag !== "extra");
  return <LogTimeClient subjects={subjects} />;
}
