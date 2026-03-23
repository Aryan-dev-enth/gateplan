import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/lib/models";

async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  await connectDB();
  const key = username.toLowerCase();
  const hash = await hashPassword(password);

  const existing = await UserModel.findOne({ username: key });
  if (existing) {
    if (existing.passwordHash !== hash) return NextResponse.json({ result: "wrong_password" });
    return NextResponse.json({ result: "ok" });
  }

  await UserModel.create({ username: key, passwordHash: hash });
  return NextResponse.json({ result: "created" });
}
