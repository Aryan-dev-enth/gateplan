import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserDataModel } from "@/lib/models";

export async function GET() {
  await connectDB();
  const docs = await UserDataModel.find({}, { username: 1, completedLectures: 1 });
  const result = docs.map((doc) => ({
    username: doc.username,
    completedLectures: Object.fromEntries(doc.completedLectures ?? new Map()),
  }));
  return NextResponse.json(result);
}
