import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserDataModel } from "@/lib/models";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  await connectDB();
  const doc = await UserDataModel.findOne({ username: username.toLowerCase() });
  if (!doc) return NextResponse.json({ completedLectures: {}, weeklyPlans: [], targetDate: null, studySessions: [] });

  return NextResponse.json({
    completedLectures: Object.fromEntries(doc.completedLectures ?? new Map()),
    weeklyPlans: doc.weeklyPlans ?? [],
    targetDate: doc.targetDate ?? null,
    studySessions: doc.studySessions ?? [],
    manualLectureRefs: Object.fromEntries(doc.manualLectureRefs ?? new Map()),
  });
}

export async function POST(req: NextRequest) {
  const { username, data } = await req.json();
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  await connectDB();
  await UserDataModel.findOneAndUpdate(
    { username: username.toLowerCase() },
    {
      completedLectures: data.completedLectures,
      weeklyPlans: data.weeklyPlans ?? [],
      targetDate: data.targetDate ?? null,
      studySessions: data.studySessions ?? [],
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true });
}
