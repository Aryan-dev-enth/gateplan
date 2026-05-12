import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ChatMessageModel } from "@/lib/models";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    // Fetch last 50 chat messages
    const messages = await ChatMessageModel.find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    
    // Convert _id to string for the frontend
    const formattedMessages = messages.map(m => ({
      ...m,
      _id: m._id.toString()
    }));
    
    // Reverse to get chronological order for chat
    return NextResponse.json({ messages: formattedMessages.reverse() });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
