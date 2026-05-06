import type { WeekData } from "./backlog";

/**
 * Returns the weekly plan as-is without extending.
 * Only returns weeks that are actually defined in weeklyPlan.json.
 */
export function extendWeeklyPlan(baseWeeks: WeekData[]): WeekData[] {
  // Simply return the base weeks without any extension
  return baseWeeks;
}

/**
 * Gets the current week from the extended weekly plan
 */
export function getCurrentWeek(weeks: WeekData[]): WeekData | null {
  const today = new Date().toISOString().split('T')[0];
  
  for (const week of weeks) {
    const weekStart = week.days[0].date;
    const weekEnd = week.days[week.days.length - 1].date;
    
    if (today >= weekStart && today <= weekEnd) {
      return week;
    }
  }
  
  return null;
}

/**
 * Gets all weeks up to and including the current week
 */
export function getWeeksUpToNow(weeks: WeekData[]): WeekData[] {
  const today = new Date().toISOString().split('T')[0];
  const result: WeekData[] = [];
  
  for (const week of weeks) {
    const weekStart = week.days[0].date;
    
    if (weekStart <= today) {
      result.push(week);
    } else {
      break;
    }
  }
  
  return result;
}
