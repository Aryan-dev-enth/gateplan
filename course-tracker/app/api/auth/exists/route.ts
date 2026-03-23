import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/lib/models";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ exists: false });
  await connectDB();
  const exists = !!(await UserModel.findOne({ username: username.toLowerCase() }));
  return NextResponse.json({ exists });
}
