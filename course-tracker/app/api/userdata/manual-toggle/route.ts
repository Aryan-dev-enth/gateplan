import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserDataModel } from "@/lib/models";

// GET — fetch all manual lecture ref completions for a user
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  await connectDB();
  const doc = await UserDataModel.findOne({ username: username.toLowerCase() });
  if (!doc) return NextResponse.json({ manualLectureRefs: {} });

  return NextResponse.json({
    manualLectureRefs: Object.fromEntries(doc.manualLectureRefs ?? new Map()),
  });
}

// POST — toggle a single manual lecture ref
// Body: { username, key, value: true (mark done) | false (unmark) }
// key format: "date|subject|module|refIndex|ref"
export async function POST(req: NextRequest) {
  const { username, key, value } = await req.json();
  if (!username || !key) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  await connectDB();
  const u = username.toLowerCase();

  let doc = await UserDataModel.findOne({ username: u });
  if (!doc) {
    doc = await UserDataModel.create({ username: u, completedLectures: new Map(), manualLectureRefs: new Map() });
  }

  const map: Map<string, number | false> = doc.manualLectureRefs ?? new Map();
  const next: number | false = value ? Date.now() : false;
  map.set(key, next);
  doc.manualLectureRefs = map;
  doc.markModified("manualLectureRefs");
  await doc.save();

  return NextResponse.json({ key, value: next });
}
