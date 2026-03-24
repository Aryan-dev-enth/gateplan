import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserDataModel } from "@/lib/models";

export async function POST(req: NextRequest) {
  const { username, session } = await req.json();
  console.log("Sessions API POST called with:", { username, session });
  
  if (!username || !session) {
    console.error("Missing fields in request:", { username, session });
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await connectDB();
  const key = username.toLowerCase();
  const newSession = { ...session, id: Date.now().toString() };
  console.log("Created new session:", newSession);

  // Use $push to atomically append — avoids Mongoose change-detection issues
  try {
    await UserDataModel.findOneAndUpdate(
      { username: key },
      { $push: { studySessions: newSession } },
      { upsert: true, new: true }
    );
    console.log("Session saved successfully to database");
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ session: newSession });
}

export async function DELETE(req: NextRequest) {
  const { username, sessionId } = await req.json();
  if (!username || !sessionId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  await connectDB();
  const key = username.toLowerCase();

  await UserDataModel.findOneAndUpdate(
    { username: key },
    { $pull: { studySessions: { id: sessionId } } }
  );

  return NextResponse.json({ ok: true });
}
