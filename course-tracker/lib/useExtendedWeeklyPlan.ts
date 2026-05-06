"use client";
import { useMemo } from "react";
import { extendWeeklyPlan } from "./weeklyPlanExtender";
import type { WeekData } from "./backlog";

/**
 * Client-side hook to extend weekly plan data
 */
export function useExtendedWeeklyPlan(baseWeeks: WeekData[]): WeekData[] {
  return useMemo(() => extendWeeklyPlan(baseWeeks), [baseWeeks]);
}
