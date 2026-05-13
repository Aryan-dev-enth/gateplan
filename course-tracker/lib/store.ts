// Client-side store — all persistence via API routes backed by MongoDB
// Session (current user) still uses localStorage as it's UI-only state

export interface StudySession {
  id: string;
  startedAt: number;       // unix ms
  durationMinutes: number;
  subjectName: string;
  moduleName?: string;
  note?: string;
}

export interface UserData {
  completedLectures: Record<string, number | false>;
  weeklyPlans: WeeklyPlan[];
  targetDate?: string;
  studySessions: StudySession[];
  manualLectureRefs: Record<string, number | false>;
  ignoredBacklogModules?: Record<string, boolean>;
  recentAiChat?: { role: string; content: string; timestamp?: string }[];
  dailySummaries?: DailySummary[];
  lastAiWellnessRemark?: { content: string; timestamp: string } | null;
  testResults?: TestResult[];
}

export interface TestResult {
  id: string;
  testName: string;
  subject: string;
  timestamp: number;
  maxMarks: number;
  marksSecured: number;
  rank?: number;
  rankOutOf?: number;
}

export interface Activity {
  name: string;
  minutes: number;
  type: 'gym' | 'running' | 'sports' | 'hangout' | 'other' | 'meditation' | 'yoga' | 'reading' | 'gaming' | 'walking' | 'work';
  intensity?: number;
  notes?: string;
}

export interface Meal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time?: string;
}

export interface SleepSlot {
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  studyHours: number; // Total
  lectureHours?: number;
  sessionHours?: number;
  activities: Activity[];
  sleepSlots: SleepSlot[];
  meals?: Meal[];
  sleepyTimes?: string[];
  scores: {
    productivity: number;
    focus: number;
    laziness: number;
  };
  outcome: string;
  type: 'study' | 'partial' | 'revision' | 'test' | 'none';
  fatigue?: number;
  habits?: string[];
  screenTime?: number;
  studyQuality?: number;
}

export interface WeeklyPlan {
  id: string;
  imageDataUrl: string;
  checkpoints: Checkpoint[];
}

export interface Checkpoint {
  id: string;
  x: number;
  y: number;
  label: string;
  done: boolean;
}

// --- Session (localStorage only) ---

export function getCurrentUser(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("coursetracker_current_user");
}

export function setCurrentUser(username: string) {
  localStorage.setItem("coursetracker_current_user", username.toLowerCase());
}

export function logout() {
  localStorage.removeItem("coursetracker_current_user");
}

// --- Auth ---

export async function loginOrRegister(
  username: string,
  password: string
): Promise<"ok" | "wrong_password" | "created"> {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  return data.result;
}

export async function userExists(username: string): Promise<boolean> {
  const res = await fetch(`/api/auth/exists?username=${encodeURIComponent(username)}`);
  const data = await res.json();
  return data.exists;
}

// --- User data ---

export async function getUser(username: string): Promise<UserData> {
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const res = await fetch(`/api/userdata?username=${encodeURIComponent(username)}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      console.error('getUser failed:', res.status, res.statusText);
      return { completedLectures: {}, weeklyPlans: [], studySessions: [], manualLectureRefs: {} };
    }
    
    const data = await res.json();
    return {
      completedLectures: data.completedLectures ?? {},
      weeklyPlans: data.weeklyPlans ?? [],
      targetDate: data.targetDate ?? undefined,
      studySessions: data.studySessions ?? [],
      manualLectureRefs: data.manualLectureRefs ?? {},
      ignoredBacklogModules: data.ignoredBacklogModules ?? {},
      recentAiChat: data.recentAiChat ?? undefined,
      dailySummaries: data.dailySummaries ?? [],
      lastAiWellnessRemark: data.lastAiWellnessRemark || null,
      testResults: data.testResults ?? [],
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    // Return fallback data on any error
    return { completedLectures: {}, weeklyPlans: [], studySessions: [], manualLectureRefs: {}, dailySummaries: [], testResults: [] };
  }
}

export async function saveUser(username: string, data: UserData): Promise<void> {
  await fetch("/api/userdata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, data }),
  });
}

/** Toggles a lecture. Returns the new value. */
export async function toggleLecture(username: string, lectureId: string): Promise<number | false> {
  const res = await fetch("/api/userdata/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, lectureId }),
  });
  const data = await res.json();
  return data.next;
}

/** Marks all lectureIds done (or all undone if all already done). Returns full completedLectures map. */
export async function toggleAllLectures(
  username: string,
  lectureIds: string[]
): Promise<Record<string, number | false>> {
  const res = await fetch("/api/userdata/toggleall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, lectureIds }),
  });
  const data = await res.json();
  return data.completedLectures;
}

export function isLectureDone(completedMap: Record<string, number | false>, id: string): boolean {
  return !!completedMap[id];
}

export async function addWeeklyPlan(username: string, imageDataUrl: string): Promise<WeeklyPlan> {
  const data = await getUser(username);
  const plan: WeeklyPlan = { id: Date.now().toString(), imageDataUrl, checkpoints: [] };
  data.weeklyPlans.push(plan);
  await saveUser(username, data);
  return plan;
}

export async function updateWeeklyPlan(username: string, plan: WeeklyPlan): Promise<void> {
  const data = await getUser(username);
  const idx = data.weeklyPlans.findIndex((p) => p.id === plan.id);
  if (idx >= 0) data.weeklyPlans[idx] = plan;
  await saveUser(username, data);
}

export async function deleteWeeklyPlan(username: string, planId: string): Promise<void> {
  const data = await getUser(username);
  data.weeklyPlans = data.weeklyPlans.filter((p) => p.id !== planId);
  await saveUser(username, data);
}

// --- Study Sessions ---

export async function logStudySession(username: string, session: Omit<StudySession, "id">): Promise<StudySession> {
  console.log("logStudySession called with:", { username, session });
  const res = await fetch("/api/userdata/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, session }),
  });
  console.log("API response status:", res.status);
  if (!res.ok) {
    const errorText = await res.text();
    console.error("API error response:", errorText);
    throw new Error(`Failed to log session: ${res.status}`);
  }
  const data = await res.json();
  console.log("API response data:", data);
  return data.session;
}

/** Toggle a manual lecture ref (for weekly plan items not in completedLectures). */
export async function toggleManualLectureRef(
  username: string,
  key: string,
  value: boolean
): Promise<number | false> {
  const res = await fetch("/api/userdata/manual-toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, key, value }),
  });
  const data = await res.json();
  return data.value;
}

/** Toggle a module ignore in backlog. */
export async function toggleBacklogModuleIgnore(
  username: string,
  moduleKey: string,
  ignored: boolean
): Promise<boolean> {
  const res = await fetch("/api/userdata/backlog-ignore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, moduleKey, ignored }),
  });
  const data = await res.json();
  return data.ignored;
}

export async function deleteStudySession(username: string, sessionId: string): Promise<void> {
  await fetch("/api/userdata/sessions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, sessionId }),
  });
}

// --- Daily Summary ---

export async function saveDailySummary(username: string, summary: DailySummary): Promise<any> {
  const res = await fetch("/api/userdata/daily-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, summary }),
  });
  return res.json();
}

export function calculateFatigue(summary: DailySummary): number {
  const physicalMinutes = summary.activities.reduce((sum, a) => sum + (a.type !== 'hangout' ? a.minutes : 0), 0);
  const studyHours = summary.studyHours;
  const screenHours = summary.screenTime || 0;
  const habitCount = summary.habits?.length || 0;
  const sleepyTimeCount = summary.sleepyTimes?.length || 0;
  
  // Calculate total sleep hours
  let sleepHours = 0;
  summary.sleepSlots.forEach(slot => {
    const [h1, m1] = slot.start.split(':').map(Number);
    const [h2, m2] = slot.end.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60; // Crosses midnight
    sleepHours += diff / 60;
  });

  // Base fatigue formula (v2)
  // Physical/Study/Screen increase fatigue. Sleep/Habits decrease it.
  // energy dips (sleepyTimes) slightly increase the 'felt' fatigue.
  let fatigue = 50 
    + (physicalMinutes / 60) * 12 
    + (studyHours) * 7 
    + (screenHours) * 4 
    + (sleepyTimeCount * 5)
    - (sleepHours * 10) 
    - (habitCount * 3);
    
  return Math.max(0, Math.min(100, Math.round(fatigue)));
}

export function getPerformancePrediction(summaries: DailySummary[]): { score: number; reason: string } {
  if (summaries.length === 0) return { score: 50, reason: "Need more data to predict." };
  
  const last = summaries[summaries.length - 1];
  
  // Calculate sleep hours of the last night
  let sleepHours = 0;
  last.sleepSlots.forEach(slot => {
    const [h1, m1] = slot.start.split(':').map(Number);
    const [h2, m2] = slot.end.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60;
    sleepHours += diff / 60;
  });
  
  let score = 50;
  let reason = "Maintaining steady performance.";
  
  if (sleepHours < 6) {
    score -= 20;
    reason = "Low sleep last night will likely impact focus today.";
  } else if (sleepHours >= 7.5) {
    score += 20;
    reason = "Optimal sleep recovery detected. High performance expected.";
  }
  
  if ((last.screenTime || 0) > 6) {
    score -= 15;
    reason += " High screen time yesterday may cause eye strain.";
  }
  
  if ((last.habits?.length || 0) >= 4) {
    score += 15;
    reason += " Routine consistency is high.";
  }
  
  return { score: Math.max(10, Math.min(100, score)), reason };
}

export async function getAiWellnessInsight(username: string, forceRefresh: boolean = false): Promise<string> {
  try {
    const res = await fetch("/api/ai/wellness-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, forceRefresh }),
    });
    const data = await res.json();
    return data.remark || data.error || "Could not generate insight.";
  } catch (e) {
    console.error(e);
    return "AI insight server is currently unavailable.";
  }
}
export async function addTestAttempt(username: string, test: Omit<TestResult, "id">): Promise<TestResult> {
  const data = await getUser(username);
  const newTest: TestResult = { ...test, id: Date.now().toString() };
  if (!data.testResults) data.testResults = [];
  data.testResults.push(newTest);
  await saveUser(username, data);
  return newTest;
}

export async function deleteTestAttempt(username: string, testId: string): Promise<void> {
  const data = await getUser(username);
  if (!data.testResults) return;
  data.testResults = data.testResults.filter((t) => t.id !== testId);
  await saveUser(username, data);
}

export async function updateTestAttempt(username: string, test: TestResult): Promise<void> {
  const data = await getUser(username);
  if (!data.testResults) return;
  const idx = data.testResults.findIndex((t) => t.id === test.id);
  if (idx >= 0) data.testResults[idx] = test;
  await saveUser(username, data);
}
