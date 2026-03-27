import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserDataModel } from "@/lib/models";
import { loadCourses } from "@/lib/courseLoader";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function getContextForUser(username: string) {
  await connectDB();
  const doc = await UserDataModel.findOne({ username: username.toLowerCase() }).lean();
  console.log(`[API/AI/CHAT] getContextForUser username=${username} foundDoc=${!!doc} historyLen=${doc?.aiChatHistory?.length || 0}`);
  
  // If no user data is found, return an empty context object
  if (!doc) {
    return {
      startDate: "Not set",
      targetDate: "Not set",
      completedLecturesCount: 0,
      studySessionsCount: 0,
      recentSessions: [],
      dailyActivity: {},
      backlogData: {},
      subjectProgress: {},
      recentWeeklyPlanner: "No active plans",
      rawString: "No user data found."
    };
  }

  const completedMap = doc?.completedLectures || {};
  let weeklyPlans = doc?.weeklyPlans || [];
  
  if (!weeklyPlans || weeklyPlans.length === 0) {
    try {
      const fs = require("fs");
      const path = require("path");
      const planPath = path.join(process.cwd(), "lib", "weeklyPlan.json");
      if (fs.existsSync(planPath)) {
        weeklyPlans = JSON.parse(fs.readFileSync(planPath, "utf8"));
      }
    } catch (e) {
      console.error("Failed to load weeklyPlan.json", e);
    }
  }

  const studySessions = doc?.studySessions || [];
  const targetDate = doc?.targetDate || "Not set";

  // Aggregate daily activity accurately for pacing predictions
  const dailyActivity: Record<string, { hours: number, sessions: number }> = {};
  if (Array.isArray(studySessions)) {
    studySessions.forEach((s: any) => {
      const d = s.date || "Unknown";
      if (!dailyActivity[d]) dailyActivity[d] = { hours: 0, sessions: 0 };
      dailyActivity[d].hours += (s.duration || 0) / 3600;
      dailyActivity[d].sessions += 1;
    });
  }

  const startDate = studySessions.length > 0 && studySessions[0].date ? studySessions[0].date : "Recently began";
  
  const courses = loadCourses();

  const today = new Date().toISOString().split("T")[0];
  let totalPlannedHours = 0;
  let backlogData: Record<string, { plannedHours: number, completedHours: number, backlogHours: number }> = {};
  const subjectProgress: Record<string, any> = {};
  
  const plannedHoursBySubject: Record<string, number> = {};
  weeklyPlans.forEach((plan: any) => {
    plan.days.forEach((day: any) => {
      if (day.date <= today) {
        day.tasks.forEach((task: any) => {
          plannedHoursBySubject[task.subject] = (plannedHoursBySubject[task.subject] || 0) + task.hours;
          totalPlannedHours += task.hours;
        });
      }
    });
  });

  const coreSubjects = courses.filter((s) => s.tag !== "extra");
  coreSubjects.forEach(subject => {
    const modulesData = subject.modules.map(m => {
      const lectures = m.lectures.filter(l => l.isLecture);
      if (lectures.length === 0) return null;
      const done = lectures.filter(l => completedMap[l.id]).length;
      return {
        moduleName: m.name,
        total: lectures.length,
        done,
        isCompleted: done === lectures.length
      };
    }).filter(Boolean);

    const lectures = subject.modules.flatMap((m) => m.lectures.filter((l) => l.isLecture));
    let doneHrs = 0;
    lectures.forEach(l => {
      if (completedMap[l.id]) {
        doneHrs += (l.duration || 0) / 3600;
      }
    });
    const plannedHrs = plannedHoursBySubject[subject.name] || 0;
    const backlogHrs = Math.max(0, plannedHrs - doneHrs);
    if (backlogHrs > 0) {
      backlogData[subject.name] = {
        plannedHours: plannedHrs,
        completedHours: doneHrs,
        backlogHours: backlogHrs
      };
    }

    subjectProgress[subject.name] = {
      modulesTotal: modulesData.length,
      modulesCompleted: modulesData.filter(m => m?.isCompleted).length,
      lecturesTotal: modulesData.reduce((sum, m) => sum + (m?.total || 0), 0),
      lecturesCompleted: modulesData.reduce((sum, m) => sum + (m?.done || 0), 0),
      modulesDetail: modulesData,
    };
  });

  // Extract recent lecture completion activity
  const flatLectures: any[] = [];
  coreSubjects.forEach(subject => {
    subject.modules.forEach(m => {
      m.lectures.forEach(l => {
        if (completedMap[l.id]) {
          flatLectures.push({
            subject: subject.name,
            module: m.name,
            lecture: l.title,
            timestamp: typeof completedMap[l.id] === 'number' ? completedMap[l.id] : Date.now()
          });
        }
      });
    });
  });
  
  // Sort descending by timestamp, take last 15
  flatLectures.sort((a, b) => b.timestamp - a.timestamp);
  const recentLectureActivity = flatLectures.slice(0, 15).map(l => ({
    ...l, 
    date: new Date(l.timestamp).toISOString().split('T')[0]
  }));

  const recentPlans = weeklyPlans.length > 0 ? weeklyPlans[0]?.days?.slice(-2) : "No active plans";

  return {
    startDate,
    targetDate,
    completedLecturesCount: Object.keys(completedMap).length,
    studySessionsCount: studySessions.length,
    recentSessions: studySessions.slice(-3),
    dailyActivity,
    backlogData,
    subjectProgress,
    recentWeeklyPlanner: recentPlans,
    rawString: `Start Date: ${startDate}
Target Date: ${targetDate}
Completed Lectures: ${Object.keys(completedMap).length} lectures done so far.
Recent Lecture Completion Log (last 15): ${JSON.stringify(recentLectureActivity.map(l => "[" + l.date + "] " + l.subject + ": " + l.lecture))}
Study Sessions: ${studySessions.length} total sessions recorded.
Daily Activity Tracking (Hours vs Sessions per day): ${JSON.stringify(dailyActivity)}
Current Backlogs (Hours behind schedule by subject): ${JSON.stringify(backlogData)}
Subject Module Progress: ${JSON.stringify(subjectProgress)}
Recent Weekly Planner Snapshot: ${JSON.stringify(recentPlans)}`
  };
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });
  const contextObj = await getContextForUser(username);

  await connectDB();
  const userData = await UserDataModel.findOne({ username: username.toLowerCase() }).lean();
  const chatHistory = userData?.aiChatHistory || [];
  console.log(`[API/AI/CHAT] GET username=${username} historyLen=${chatHistory.length}`);

  return NextResponse.json({ ...contextObj, chatHistory });
}

export async function DELETE(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  console.log(`[API/AI/CHAT] DELETE request for username=${username}`);
  if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });

  await connectDB();
  const res = await UserDataModel.collection.updateOne(
    { username: username.toLowerCase() },
    { $set: { aiChatHistory: [] } as any }
  );
  console.log(`[API/AI/CHAT] DELETE result:`, res);

  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  try {
    const { messages, username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    await connectDB();
    const userData = await UserDataModel.findOne({ username: username.toLowerCase() }).lean();
    
    // Default empty data if not found
    const contextObj = await getContextForUser(username);

    const sysMsg = `You are a helpful and intelligent study assistant for a student ("${username}") preparing for an exam. Use the context provided below to answer their queries.
IMPORTANT FORMATTING RULES:
1. Be extremely concise. Use bullet points and tables instead of long paragraphs.
2. Structure your response into clear sections using Markdown headings (e.g., ### Analysis, ### Action Plan).
3. Do not formulate robotic pleasantries. Get straight to the data.
4. Bold key numbers, dates, and course names.

--- USER STUDY DATA CONTEXT ---
${contextObj.rawString}
--- END CONTEXT ---`;

    const formattedMessages = [
      { role: "user", parts: [{ text: sysMsg }] },
      { role: "model", parts: [{ text: "Understood! I have read your progress context and am ready to answer your questions accurately." }] },
      ...messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }))
    ];

    const response = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: formattedMessages,
    });

    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // Create a ReadableStream to stream the response
    const stream = new ReadableStream({
      async start(controller) {
        let fullAiText = "";
        for await (const chunk of response) {
          if (chunk.text) {
            fullAiText += chunk.text;
            controller.enqueue(new TextEncoder().encode(chunk.text));
          }
        }
        controller.close();

        // Save history in the background
        if (lastUserMessage) {
          try {
            await UserDataModel.collection.updateOne(
              { username: username.toLowerCase() },
              { 
                $push: { 
                  aiChatHistory: { 
                    $each: [
                      { role: "user", content: lastUserMessage, timestamp: new Date() },
                      { role: "model", content: fullAiText, timestamp: new Date() }
                    ] 
                  } 
                } 
              } as any
            );
          } catch(e) {
            console.error("Could not save AI history", e);
          }
        }
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error: any) {
    console.error("Error in AI chat API:", error);
    let errorMsg = error.message || "Internal server error";
    try {
      if (typeof errorMsg === "string" && errorMsg.includes("{")) {
        const match = errorMsg.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed?.error?.message) {
            let innerMsg = parsed.error.message;
            if (typeof innerMsg === "string" && innerMsg.startsWith("{")) {
              innerMsg = JSON.parse(innerMsg)?.error?.message || innerMsg;
            }
            errorMsg = innerMsg;
          }
        }
      }
    } catch (e) {}

    return NextResponse.json({ error: errorMsg }, { status: error.status || 500 });
  }
}
