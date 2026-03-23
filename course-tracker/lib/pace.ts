/**
 * Pace & ETA calculation engine.
 *
 * Two ETA modes:
 *
 * A) Actual pace (history-based):
 *    1. Look at last WINDOW_DAYS days of activity.
 *    2. lecturesPerDay = completions in window / WINDOW_DAYS
 *    3. consistencyFactor = activeDays / WINDOW_DAYS
 *    4. adjustedPace = lecturesPerDay × (0.5 + 0.5 × consistencyFactor)
 *    5. daysToFinish = remaining / adjustedPace
 *
 * B) Plan pace (target-based):
 *    Uses weeklyTargetLectures / 7 as the daily target pace.
 *    daysToFinishPlan = remaining / (weeklyTargetLectures / 7)
 *
 * Confidence:
 *   "high"   — activeDays >= 5 and windowCompletions >= 10
 *   "medium" — activeDays >= 2 or windowCompletions >= 3
 *   "low"    — otherwise
 */

import type { WeekData } from "@/app/weekly/page";

export interface PaceResult {
  lecturesPerDay: number;
  adjustedPace: number;
  activeDays: number;
  windowCompletions: number;
  daysToFinish: number | null;       // at actual pace
  etaDate: Date | null;              // at actual pace
  daysToFinishPlan: number | null;   // at plan pace
  etaDatePlan: Date | null;          // at plan pace
  weeklyTargetLectures: number;      // 0 if not provided
  confidence: "high" | "medium" | "low";
}

export const ROLLING_WINDOW_DAYS = 28;

const WINDOW_DAYS = 14;

/**
 * Returns the average planned daily study hours derived from the Weekly_Plan.
 *
 * Selection logic:
 *  1. Find the week whose date range contains today.
 *  2. If none, use the most recently passed week (largest lastDay ≤ today).
 *  3. If no past week, use the first future week.
 *  4. Return totalWeekHours / 7; return 0 if weeks is empty.
 */
export function getPlannedDailyHours(weeks: WeekData[]): number {
  if (weeks.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0];

  // Weeks with at least one day
  const validWeeks = weeks.filter((w) => w.days.length > 0);
  if (validWeeks.length === 0) return 0;

  const weekRanges = validWeeks.map((w) => ({
    week: w,
    firstDay: w.days[0].date,
    lastDay: w.days[w.days.length - 1].date,
  }));

  // 1. Current week: firstDay <= today <= lastDay
  const currentWeek = weekRanges.find(
    ({ firstDay, lastDay }) => firstDay <= today && today <= lastDay,
  );
  if (currentWeek) return totalHours(currentWeek.week) / 7;

  // 2. Most recently passed week: largest lastDay that is still <= today
  const pastWeeks = weekRanges.filter(({ lastDay }) => lastDay < today);
  if (pastWeeks.length > 0) {
    const mostRecent = pastWeeks.reduce((best, cur) =>
      cur.lastDay > best.lastDay ? cur : best,
    );
    return totalHours(mostRecent.week) / 7;
  }

  // 3. Fallback: first future week
  const futureWeeks = weekRanges.filter(({ firstDay }) => firstDay > today);
  if (futureWeeks.length > 0) {
    const first = futureWeeks.reduce((best, cur) =>
      cur.firstDay < best.firstDay ? cur : best,
    );
    return totalHours(first.week) / 7;
  }

  return 0;
}

/**
 * Returns the last scheduled date in the weekly plan (the plan's end date).
 * Used to show "plan ETA" = when the schedule runs out.
 */
export function getPlanEndDate(weeks: WeekData[]): Date | null {
  const validWeeks = weeks.filter((w) => w.days.length > 0);
  if (validWeeks.length === 0) return null;
  const lastWeek = validWeeks[validWeeks.length - 1];
  const lastDay = lastWeek.days[lastWeek.days.length - 1];
  return new Date(lastDay.date);
}

function totalHours(week: WeekData): number {
  return week.days.reduce(
    (sum, day) => sum + day.tasks.reduce((s, t) => s + t.hours, 0),
    0,
  );
}

/** Returns the median of a numeric array. Returns 0 for empty arrays. */
export function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calcPace(
  completedMap: Record<string, number | false>,
  remaining: number,
  lectureIdSet?: Set<string>,
  weeklyTargetLectures = 0,
): PaceResult {
  const now = Date.now();
  const windowStart = now - WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const allEntries = Object.entries(completedMap)
    .filter(([id, v]) => typeof v === "number" && v > 0 && (!lectureIdSet || lectureIdSet.has(id)));

  const timestamps = allEntries.map(([, v]) => v as number);
  const windowTs = timestamps.filter((ts) => ts >= windowStart);
  const windowCompletions = windowTs.length;

  const activeDaySet = new Set(windowTs.map((ts) => new Date(ts).toDateString()));
  const activeDays = activeDaySet.size;

  const lecturesPerDay = windowCompletions / WINDOW_DAYS;
  const consistencyFactor = activeDays / WINDOW_DAYS;
  const adjustedPace = lecturesPerDay * (0.5 + 0.5 * consistencyFactor);

  // Actual-pace ETA
  let daysToFinish: number | null = null;
  let etaDate: Date | null = null;
  if (adjustedPace > 0 && remaining > 0) {
    daysToFinish = Math.ceil(remaining / adjustedPace);
    daysToFinish = Math.min(daysToFinish, 999);
    etaDate = new Date(now + daysToFinish * 24 * 60 * 60 * 1000);
  } else if (remaining === 0) {
    daysToFinish = 0;
    etaDate = new Date(now);
  }

  // Plan-pace ETA
  let daysToFinishPlan: number | null = null;
  let etaDatePlan: Date | null = null;
  if (weeklyTargetLectures > 0) {
    const planDailyPace = weeklyTargetLectures / 7;
    if (remaining === 0) {
      daysToFinishPlan = 0;
      etaDatePlan = new Date(now);
    } else {
      daysToFinishPlan = Math.ceil(remaining / planDailyPace);
      daysToFinishPlan = Math.min(daysToFinishPlan, 999);
      etaDatePlan = new Date(now + daysToFinishPlan * 24 * 60 * 60 * 1000);
    }
  }

  const confidence: PaceResult["confidence"] =
    activeDays >= 5 && windowCompletions >= 10
      ? "high"
      : activeDays >= 2 || windowCompletions >= 3
      ? "medium"
      : "low";

  return {
    lecturesPerDay,
    adjustedPace,
    activeDays,
    windowCompletions,
    daysToFinish,
    etaDate,
    daysToFinishPlan,
    etaDatePlan,
    weeklyTargetLectures,
    confidence,
  };
}

export function formatEta(etaDate: Date | null, daysToFinish: number | null): string {
  if (etaDate === null || daysToFinish === null) return "No data yet";
  if (daysToFinish === 0) return "Complete!";
  return etaDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatPace(adjustedPace: number): string {
  if (adjustedPace < 0.1) return "< 0.1 / day";
  return `${adjustedPace.toFixed(1)} / day`;
}

/** Format hours as "2h 30m" or "45m" */
export function formatHours(hours: number): string {
  if (hours <= 0) return "0m";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export interface SimpleEtaResult {
  avgDailyHours: number;       // totalHoursStudied / daysSinceStart
  totalHoursStudied: number;
  daysSinceStart: number;
  hoursRemaining: number;
  daysToFinish: number | null;
  etaDate: Date | null;
  noData: boolean;
}

const PLAN_START_DATE = "2026-02-23";

/**
 * Simple ETA: average daily hours since Feb 23 2026, projected forward.
 */
export function calcSimpleEta(
  completedMap: Record<string, number | false>,
  durationMap: Record<string, number>,
  hoursRemaining: number,
  lectureIdSet?: Set<string>,
): SimpleEtaResult {
  const now = Date.now();
  const startMs = new Date(PLAN_START_DATE).getTime();
  const daysSinceStart = Math.max(1, Math.ceil((now - startMs) / 86400000));

  const allEntries = Object.entries(completedMap).filter(
    ([id, v]) =>
      typeof v === "number" &&
      v > 0 &&
      (!lectureIdSet || lectureIdSet.has(id)),
  ) as [string, number][];

  const totalHoursStudied = allEntries.reduce(
    (sum, [id]) => sum + (durationMap[id] ?? 0) / 3600,
    0,
  );

  const noData = totalHoursStudied === 0;
  const avgDailyHours = noData ? 0 : totalHoursStudied / daysSinceStart;

  let daysToFinish: number | null = null;
  let etaDate: Date | null = null;

  if (hoursRemaining <= 0) {
    daysToFinish = 0;
    etaDate = new Date(now);
  } else if (avgDailyHours > 0) {
    daysToFinish = Math.ceil(hoursRemaining / avgDailyHours);
    etaDate = new Date(now + daysToFinish * 86400000);
  }

  return { avgDailyHours, totalHoursStudied, daysSinceStart, hoursRemaining, daysToFinish, etaDate, noData };
}

export interface PracticalEtaResult {
  medianDailyHours: number;
  consistencyScore: number;
  adjustedPace: number;
  activeDays: number;
  totalHoursStudied: number;
  hoursRemaining: number;
  daysToFinish: number | null;
  etaDate: Date | null;
  plannedDailyHours: number;
  daysToFinishPlan: number | null;
  etaDatePlan: Date | null;
  confidence: "high" | "medium" | "low";
  isBehindPlan: boolean;
  usedFallback: boolean;
}

export function calcPracticalEta(
  completedMap: Record<string, number | false>,
  durationMap: Record<string, number>,
  hoursRemaining: number,
  plannedDailyHours: number,
  lectureIdSet?: Set<string>,
  planStartDate?: string,   // "YYYY-MM-DD" — first day of the weekly plan
): PracticalEtaResult {
  const now = Date.now();
  const windowStart = now - ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // Collect all completions (no window cap — we want everything since plan start)
  const allEntries = Object.entries(completedMap).filter(
    ([id, v]) =>
      typeof v === "number" &&
      v > 0 &&
      (!lectureIdSet || lectureIdSet.has(id)),
  ) as [string, number][];

  // For window-based stats, also keep a windowed subset
  const windowEntries = allEntries.filter(([, v]) => v >= windowStart);

  // Build dateString → hours map from ALL completions
  const dailyMap = new Map<string, number>();
  for (const [id, ts] of allEntries) {
    const dateStr = new Date(ts).toDateString();
    dailyMap.set(dateStr, (dailyMap.get(dateStr) ?? 0) + (durationMap[id] ?? 0) / 3600);
  }

  // Active days (distinct days with any completion)
  const activeDays = dailyMap.size;

  // spanDays: days since FIRST actual completion (not plan start)
  // Plan start is only used as a minimum floor — if you started late,
  // we measure from when you actually began, not from the plan's day 1.
  let spanDays: number;
  if (allEntries.length > 0) {
    const earliestCompletion = Math.min(...allEntries.map(([, ts]) => ts));
    const planStartMs = planStartDate ? new Date(planStartDate).getTime() : earliestCompletion;
    // Use whichever is later: plan start or first completion
    const referenceMs = Math.max(planStartMs, earliestCompletion);
    spanDays = Math.max(1, Math.ceil((now - referenceMs) / 86400000));
  } else {
    spanDays = 1;
  }

  // Consistency score — informational only
  const consistencyScore = activeDays / Math.min(spanDays, ROLLING_WINDOW_DAYS);

  // Median of active days (kept for display/reference)
  const dailyHoursArr = Array.from(dailyMap.values()).filter((h) => h > 0);
  const medianDailyHours = medianOf(dailyHoursArr);
  const totalHoursStudied = dailyHoursArr.reduce((s, h) => s + h, 0);

  // Adjusted pace logic:
  // - If no history: use plannedDailyHours (can't do better)
  // - If < 7 active days: blend plan pace with actual (plan is more reliable early on)
  // - If >= 7 active days: use pure historical average (enough data to trust it)
  let adjustedPace: number;
  let usedFallback: boolean;

  if (activeDays === 0 || totalHoursStudied === 0) {
    // No data at all — fall back to plan
    adjustedPace = plannedDailyHours;
    usedFallback = true;
  } else if (activeDays < 7) {
    // Sparse history — blend: weight plan more heavily early on
    // weight shifts from 80% plan → 0% plan as activeDays goes 1→7
    const planWeight = 1 - (activeDays / 7);
    const historicalAvg = totalHoursStudied / spanDays;
    adjustedPace = planWeight * plannedDailyHours + (1 - planWeight) * historicalAvg;
    usedFallback = false;
  } else {
    // Enough history — trust the actual average
    adjustedPace = totalHoursStudied / spanDays;
    usedFallback = false;
  }

  // Keep windowEntries reference for confidence calculation
  const windowActiveDays = new Set(windowEntries.map(([, ts]) => new Date(ts).toDateString())).size;
  const earliestWindowTs = windowEntries.length > 0 ? Math.min(...windowEntries.map(([, ts]) => ts)) : now;

  // Step 10: Practical ETA
  let daysToFinish: number | null;
  let etaDate: Date | null;
  if (hoursRemaining <= 0) {
    daysToFinish = 0;
    etaDate = new Date(now);
  } else if (adjustedPace > 0) {
    daysToFinish = Math.ceil(hoursRemaining / adjustedPace);
    etaDate = new Date(now + daysToFinish * 86400000);
  } else {
    daysToFinish = null;
    etaDate = null;
  }

  // Step 11: Plan ETA
  let daysToFinishPlan: number | null;
  let etaDatePlan: Date | null;
  if (hoursRemaining <= 0) {
    daysToFinishPlan = 0;
    etaDatePlan = new Date(now);
  } else if (plannedDailyHours > 0) {
    daysToFinishPlan = Math.ceil(hoursRemaining / plannedDailyHours);
    etaDatePlan = new Date(now + daysToFinishPlan * 86400000);
  } else {
    daysToFinishPlan = null;
    etaDatePlan = null;
  }

  // Confidence
  let confidence: PracticalEtaResult["confidence"];
  if (windowActiveDays >= 7 && now - earliestWindowTs >= 14 * 86400000) {
    confidence = "high";
  } else if (windowActiveDays >= 3) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // Step 13: isBehindPlan
  const isBehindPlan =
    etaDate !== null &&
    etaDatePlan !== null &&
    etaDate.getTime() - etaDatePlan.getTime() > 30 * 86400000;

  return {
    medianDailyHours,
    consistencyScore,
    adjustedPace,
    activeDays,
    totalHoursStudied,
    hoursRemaining,
    daysToFinish,
    etaDate,
    plannedDailyHours,
    daysToFinishPlan,
    etaDatePlan,
    confidence,
    isBehindPlan,
    usedFallback,
  };
}
