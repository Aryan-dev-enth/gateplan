import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserDataModel } from "@/lib/models";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  await connectDB();
  const doc = await UserDataModel.findOne({ username: username.toLowerCase() }).lean();
  console.log(`[API/USERDATA] GET username=${username} foundDoc=${!!doc} historyLen=${doc?.aiChatHistory?.length || 0}`);
  if (!doc) return NextResponse.json({ completedLectures: {}, weeklyPlans: [], targetDate: null, studySessions: [], dailySummaries: [], manualLectureRefs: {} });

  return NextResponse.json({
    completedLectures: doc.completedLectures || {},
    weeklyPlans: doc.weeklyPlans ?? [],
    targetDate: doc.targetDate ?? null,
    studySessions: doc.studySessions ?? [],
    manualLectureRefs: doc.manualLectureRefs || {},
    recentAiChat: doc.aiChatHistory && doc.aiChatHistory.length > 0 ? doc.aiChatHistory.slice(-2) : null,
    dailySummaries: doc.dailySummaries || [],
    lastAiWellnessRemark: doc.lastAiWellnessRemark ?? null,
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
      dailySummaries: data.dailySummaries ?? [],
      manualLectureRefs: data.manualLectureRefs || {},
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true });
}
