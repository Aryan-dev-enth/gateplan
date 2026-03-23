import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserDataModel } from "@/lib/models";

export async function POST(req: NextRequest) {
  const { username, lectureIds } = await req.json();
  if (!username || !lectureIds) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  await connectDB();
  const key = username.toLowerCase();

  let doc = await UserDataModel.findOne({ username: key });
  if (!doc) {
    doc = await UserDataModel.create({ username: key, completedLectures: new Map(), weeklyPlans: [] });
  }

  const map: Map<string, number | false> = doc.completedLectures ?? new Map();
  const allDone = (lectureIds as string[]).every((id) => !!map.get(id));
  const now = Date.now();
  for (const id of lectureIds as string[]) {
    map.set(id, allDone ? false : now);
  }
  doc.completedLectures = map;
  doc.markModified("completedLectures");
  await doc.save();

  return NextResponse.json({ completedLectures: Object.fromEntries(map) });
}
