import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserDataModel } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    const { username, moduleKey, ignored } = await req.json();
    if (!username || !moduleKey) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    await connectDB();
    const key = username.toLowerCase();

    // 1. Get current data (lean to avoid Mongoose Map instance logic)
    const doc = await UserDataModel.findOne({ username: key }).lean();
    if (!doc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Update the field in a plain JS object
    const currentMap = doc.ignoredBacklogModules || {};
    currentMap[moduleKey] = !!ignored;

    // 3. Use the raw MongoDB collection to bypass Mongoose's potentially stale schema
    // This is the most reliable way to ensure a newly added field persists 
    // without needing a full server restart to refresh the Mongoose Model.
    await UserDataModel.collection.updateOne(
      { username: key },
      { 
        $set: { ignoredBacklogModules: currentMap } 
      }
    );

    console.log(`[API/BACKLOG-IGNORE] Raw DB update successful for ${username}: ${moduleKey}=${ignored}`);
    return NextResponse.json({ ignored: !!ignored });
  } catch (error: any) {
    console.error("[API/BACKLOG-IGNORE] Persistence error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
