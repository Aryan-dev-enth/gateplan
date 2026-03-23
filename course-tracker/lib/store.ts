// Client-side store — all persistence via API routes backed by MongoDB
// Session (current user) still uses localStorage as it's UI-only state

export interface UserData {
  completedLectures: Record<string, number | false>;
  weeklyPlans: WeeklyPlan[];
  targetDate?: string;
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
  const res = await fetch(`/api/userdata?username=${encodeURIComponent(username)}`);
  if (!res.ok) return { completedLectures: {}, weeklyPlans: [] };
  const data = await res.json();
  return {
    completedLectures: data.completedLectures ?? {},
    weeklyPlans: data.weeklyPlans ?? [],
    targetDate: data.targetDate ?? undefined,
  };
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
