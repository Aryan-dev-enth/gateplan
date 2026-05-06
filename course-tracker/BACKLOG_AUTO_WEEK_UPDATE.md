# Automatic Weekly Plan Extension

## Problem
The backlog section was not incorporating new weeks automatically. The `weeklyPlan.json` file only contained weeks up to week-8 (ending April 19, 2026), but the current date is May 5, 2026. This caused the backlog calculation to be incomplete and not reflect the current week's status.

## Solution
Implemented an automatic weekly plan extension system that dynamically generates future weeks based on the existing `weeklyPlan.json` structure.

## Changes Made

### 1. New Utility: `weeklyPlanExtender.ts`
Created a new utility module at `course-tracker/lib/weeklyPlanExtender.ts` with the following functions:

- **`extendWeeklyPlan(baseWeeks: WeekData[]): WeekData[]`**
  - Automatically extends the weekly plan to include the current week and 4 weeks into the future
  - Generates empty task arrays for future weeks (since they haven't been planned yet)
  - Maintains the same week structure and date format as the original plan
  - Returns the extended weeks array

- **`getCurrentWeek(weeks: WeekData[]): WeekData | null`**
  - Helper function to get the current week from the extended plan

- **`getWeeksUpToNow(weeks: WeekData[]): WeekData[]`**
  - Helper function to get all weeks up to and including the current week

### 2. Client-Side Hook: `useExtendedWeeklyPlan.ts`
Created a React hook at `course-tracker/lib/useExtendedWeeklyPlan.ts` for client components:

- **`useExtendedWeeklyPlan(baseWeeks: WeekData[]): WeekData[]`**
  - Memoized hook that extends the weekly plan on the client side
  - Used in client components that need extended week data

### 3. Updated All Pages and Components
Updated the following files to use the extended weekly plan:

#### Server Components (using `extendWeeklyPlan` directly):
- `course-tracker/app/dashboard/page.tsx`
- `course-tracker/app/backlog/page.tsx`
- `course-tracker/app/activity/page.tsx`
- `course-tracker/app/subject/[id]/page.tsx`
- `course-tracker/app/leaderboard/page.tsx`
- `course-tracker/app/module/[id]/page.tsx`
- `course-tracker/app/weekly/page.tsx`

#### Client Components (using `useExtendedWeeklyPlan` hook):
- `course-tracker/components/SummaryCalendar.tsx`

## How It Works

1. **Base Data**: The `weeklyPlan.json` file contains the manually planned weeks (week-1 through week-8)

2. **Extension Logic**: 
   - When any page loads, it calls `extendWeeklyPlan()` with the base weeks
   - The function checks if the last week in the plan is before today
   - If yes, it calculates how many weeks to add (current week + 4 weeks buffer)
   - Generates new week objects with empty task arrays
   - Returns the combined array of base weeks + generated weeks

3. **Backlog Calculation**: 
   - The `calculateBacklog()` function in `backlog.ts` now receives extended weeks
   - It correctly calculates backlog for all elapsed days, including the current week
   - Future weeks (with empty tasks) don't affect backlog calculation

## Benefits

1. **Automatic Updates**: No manual intervention needed when weeks pass
2. **Always Current**: Backlog always reflects the current week's status
3. **Future-Proof**: Automatically generates weeks up to 4 weeks in the future
4. **Backward Compatible**: Original `weeklyPlan.json` structure remains unchanged
5. **Consistent**: All pages and components use the same extended data

## Testing

To verify the changes work correctly:

1. Check the Dashboard - backlog metrics should now include the current week
2. Visit the Backlog page - it should show pending lectures from all elapsed weeks including current
3. Check the Weekly page - it should display the current week even if not in the original plan
4. Verify the Summary Calendar - it should work with extended weeks

## Future Enhancements

Potential improvements for the future:

1. Add ability to manually add tasks to future weeks through the UI
2. Implement AI-based task suggestions for future weeks based on progress
3. Add week-by-week planning interface
4. Store extended weeks with user-added tasks in the database
