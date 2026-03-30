import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserDataModel } from "@/lib/models";

export async function POST(req: NextRequest) {
  const { username, summary } = await req.json();
  
  if (!username || !summary || !summary.date) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await connectDB();
  const key = username.toLowerCase();

  try {
    let user = await UserDataModel.findOne({ username: key });
    
    if (!user) {
      user = new UserDataModel({ username: key, dailySummaries: [] });
    }

    console.log("Saving summary for user:", key);
    
    if (!user.dailySummaries || !Array.isArray(user.dailySummaries)) {
      user.dailySummaries = [];
    }

    const summaries = user.dailySummaries as any[];
    const existingIndex = summaries.findIndex((s: any) => s && s.date === summary.date);
    
    if (existingIndex >= 0) {
      user.dailySummaries[existingIndex] = summary;
    } else {
      user.dailySummaries.push(summary);
    }

    user.markModified("dailySummaries");

    try {
      await user.save();
      return NextResponse.json({ ok: true });
    } catch (saveError: any) {
      console.error("Mongoose Save Error:", saveError.message, saveError.errors);
      return NextResponse.json({ error: "Save validation error", details: saveError.message }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Daily Summary API Error:", err.message);
    return NextResponse.json({ error: "Internal server error", message: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  await connectDB();
  const doc = await UserDataModel.findOne({ username: username.toLowerCase() }).lean();
  
  if (!doc) return NextResponse.json({ dailySummaries: [] });

  return NextResponse.json({
    dailySummaries: doc.dailySummaries || []
  });
}
