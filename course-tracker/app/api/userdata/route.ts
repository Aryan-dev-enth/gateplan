import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserDataModel, AccountLogModel } from "@/lib/models";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  await connectDB();
  const doc = await UserDataModel.findOne({ username: username.toLowerCase() }).lean();
  console.log(`[API/USERDATA] GET username=${username} foundDoc=${!!doc} historyLen=${doc?.aiChatHistory?.length || 0}`);
  
  // Log the dashboard load
  await AccountLogModel.create({ username: username.toLowerCase(), action: "dashboard_load" }).catch(e => console.error("Failed to log dashboard load", e));

  if (!doc) return NextResponse.json({ completedLectures: {}, weeklyPlans: [], targetDate: null, studySessions: [], dailySummaries: [], manualLectureRefs: {} });

  return NextResponse.json({
    completedLectures: doc.completedLectures || {},
    weeklyPlans: doc.weeklyPlans ?? [],
    targetDate: doc.targetDate ?? null,
    studySessions: doc.studySessions ?? [],
    manualLectureRefs: doc.manualLectureRefs || {},
    ignoredBacklogModules: doc.ignoredBacklogModules || {},
    recentAiChat: doc.aiChatHistory && doc.aiChatHistory.length > 0 ? doc.aiChatHistory.slice(-2) : null,
    dailySummaries: doc.dailySummaries || [],
    lastAiWellnessRemark: doc.lastAiWellnessRemark ?? null,
    testResults: doc.testResults || [],
  });
}

export async function POST(req: NextRequest) {
  const { username, data } = await req.json();
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  await connectDB();
  const updateData: any = {
    completedLectures: data.completedLectures,
    weeklyPlans: data.weeklyPlans ?? [],
    targetDate: data.targetDate ?? null,
    studySessions: data.studySessions ?? [],
    dailySummaries: data.dailySummaries ?? [],
    manualLectureRefs: data.manualLectureRefs || {},
    testResults: data.testResults || [],
  };

  // Only update ignoredBacklogModules if it's explicitly provided in the payload
  // This prevents components that aren't aware of this field from wiping it out.
  if (data.ignoredBacklogModules !== undefined) {
    updateData.ignoredBacklogModules = data.ignoredBacklogModules;
  }

  await UserDataModel.findOneAndUpdate(
    { username: username.toLowerCase() },
    { $set: updateData },
    { upsert: true, new: true, strict: false }
  );

  return NextResponse.json({ ok: true });
}
