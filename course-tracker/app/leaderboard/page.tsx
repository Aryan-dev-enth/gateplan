import { loadCourses } from "@/lib/courseLoader";
import LeaderboardClient from "./LeaderboardClient";

export default function LeaderboardPage() {
  const subjects = loadCourses();
  return <LeaderboardClient subjects={subjects} />;
}
