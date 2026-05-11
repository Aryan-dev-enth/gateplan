import { NextResponse } from "next/server";
import { loadCourses } from "@/lib/courseLoader";

export async function GET() {
  try {
    const subjects = loadCourses();
    return NextResponse.json({ subjects });
  } catch (error) {
    console.error("Failed to load subjects:", error);
    return NextResponse.json({ subjects: [], error: "Failed to load subjects" }, { status: 500 });
  }
}
