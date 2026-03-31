import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserDataModel } from "@/lib/models";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { username, forceRefresh } = await req.json();
    if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

    await connectDB();
    const user = await UserDataModel.findOne({ username: username.toLowerCase() });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Caching logic: If forceRefresh is false and we have a recent remark (last 6 hours), return it
    const now = new Date();
    if (!forceRefresh && user.lastAiWellnessRemark?.content) {
      const lastUpdate = new Date(user.lastAiWellnessRemark.timestamp);
      const diffMs = now.getTime() - lastUpdate.getTime();
      if (diffMs < 6 * 60 * 60 * 1000) { // 6 hours
        return NextResponse.json({ remark: user.lastAiWellnessRemark.content });
      }
    }

    const summaries = user.dailySummaries || [];
    const recentSummaries = summaries.slice(-14);
    const studySessions = user.studySessions || [];
    const recentSessions = studySessions.slice(-20); // Last 20 sessions

    const context = {
      currentTime: now.toLocaleTimeString('en-GB'),
      history: recentSummaries.map((s: any) => ({
        date: s.date,
        studyHours: s.studyHours,
        focus: s.scores?.focus,
        fatigue: s.fatigue,
        screenTime: s.screenTime,
        meals: s.meals?.map((m: any) => ({ name: m.name, time: m.time, cal: m.calories })),
        energyDips: s.sleepyTimes,
        habits: s.habits?.length || 0,
      })),
      recentStudySessions: recentSessions.map((s: any) => ({
        date: s.date,
        subject: s.subject,
        durationMinutes: Math.round((s.duration || 0) / 60),
        startTime: s.startTime
      })),
      today: {
        date: now.toISOString().split('T')[0],
        status: "System just started today (March 31, 2026). Initial meals and logs are being populated."
      }
    };

    const prompt = `You are a peak-performance wellness/study coach for ${username}. 
CURRENT TIME: ${now.toLocaleTimeString('en-GB')}
SYSTEM START DATE: March 31, 2026 (Today). 
DUE TO INITIAL START, DO NOT FLAG "DATA DEFICIENCY". INSTEAD, TREAT TODAY'S ENTRIES AS THE NEW BASELINE.

USER DATA:
${JSON.stringify(context, null, 2)}

Provide a sharp, personalized "Status Remark" (2-3 sentences max) about their current situation (considering study sessions, sleep schedule, nutrition, and energy dips). 
Forecast their performance for the next 24 hours based on these initial readings.
Highlight one specific positive or one core area to watch.
BE DIRECT. Use bold text for key insights. No generic motivation.`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const remark = result.candidates?.[0]?.content?.parts?.[0]?.text || "No insight generated.";

    // Save to cache
    user.lastAiWellnessRemark = {
      content: remark,
      timestamp: now
    };
    await user.save();

    return NextResponse.json({ remark });
  } catch (error: any) {
    console.error("AI Wellness Insight Error:", error);
    return NextResponse.json({ 
      error: "Failed to generate insight", 
      details: error.message || "Unknown error" 
    }, { status: 500 });
  }
}
