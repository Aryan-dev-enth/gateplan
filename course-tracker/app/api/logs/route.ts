import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AccountLogModel } from "@/lib/models";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    // Fetch top 500 logs, sorted by newest first
    const logs = await AccountLogModel.find({})
      .sort({ timestamp: -1 })
      .limit(500)
      .lean();
    
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
