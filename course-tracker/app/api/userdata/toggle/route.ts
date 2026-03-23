import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserDataModel } from "@/lib/models";

export async function POST(req: NextRequest) {
  const { username, lectureId } = await req.json();
  if (!username || !lectureId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  await connectDB();
  const key = username.toLowerCase();

  let doc = await UserDataModel.findOne({ username: key });
  if (!doc) {
    doc = await UserDataModel.create({ username: key, completedLectures: new Map(), weeklyPlans: [] });
  }

  const map: Map<string, number | false> = doc.completedLectures ?? new Map();
  const current = map.get(lectureId);
  const next: number | false = current ? false : Date.now();
  map.set(lectureId, next);
  doc.completedLectures = map;
  doc.markModified("completedLectures");
  await doc.save();

  return NextResponse.json({ next });
}
