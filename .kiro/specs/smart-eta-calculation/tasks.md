# Implementation Plan: Smart ETA Calculation

## Overview

Replaces the existing mean-based ETA with a median-based, binge-resistant practical ETA. Changes are isolated to `lib/pace.ts` (engine) and `components/EtaCard.tsx` (display), with minor prop-wiring updates in `DashboardClient.tsx`, `ActivityClient.tsx`, and `activity/page.tsx`.

## Tasks

- [x] 1. Extend `lib/pace.ts` with new engine exports
  - [x] 1.1 Add `ROLLING_WINDOW_DAYS = 28` constant and `medianOf` helper
    - Export `ROLLING_WINDOW_DAYS` as a named constant
    - Implement `medianOf(values: number[]): number` — sort ascending, return middle element (odd) or average of two middle elements (even), return 0 for empty array
    - _Requirements: 6.1, 6.2_

  - [ ]* 1.2 Write property test for `medianOf`
    - **Property 1: Median of a sorted array equals median of its reverse**
    - **Validates: Requirements 1.2**

  - [x] 1.3 Add `getPlannedDailyHours(weeks: WeekData[]): number`
    - Find the week whose `days[0].date`–`days[last].date` range contains today; if none, use the most recently passed week; if no past week, use the first future week
    - Return `totalWeekHours / 7`; return `0` if `weeks` is empty
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 1.4 Write unit tests for `getPlannedDailyHours`
    - Test: current date inside a week → correct week selected
    - Test: current date outside all weeks → most recent past week selected
    - Test: empty weeks array → returns 0
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.5 Add `PracticalEtaResult` interface and `calcPracticalEta` function
    - Define `PracticalEtaResult` interface with all fields from the design (`medianDailyHours`, `consistencyScore`, `adjustedPace`, `activeDays`, `hoursRemaining`, `daysToFinish`, `etaDate`, `plannedDailyHours`, `daysToFinishPlan`, `etaDatePlan`, `confidence`, `isBehindPlan`, `usedFallback`)
    - Implement `calcPracticalEta(completedMap, durationMap, hoursRemaining, plannedDailyHours, lectureIdSet?)`:
      1. Collect completions within last `ROLLING_WINDOW_DAYS` days (filter by `lectureIdSet` if provided)
      2. Build `Map<dateString, hours>` summing `durationMap[id] / 3600` per calendar day
      3. Compute `medianDailyHours` via `medianOf`
      4. Compute `activeDays` and `consistencyScore = activeDays / ROLLING_WINDOW_DAYS`
      5. If `activeDays < 3`, set `adjustedPace = plannedDailyHours`, `usedFallback = true`; else `adjustedPace = medianDailyHours × (0.4 + 0.6 × consistencyScore)`
      6. If `adjustedPace === 0` and `hoursRemaining > 0`, return null ETA dates
      7. Compute practical and plan ETA dates from respective paces
      8. Classify confidence: high (`activeDays >= 7` AND earliest completion ≥ 14 days ago), medium (3–6), low (< 3)
      9. Set `isBehindPlan` when practical ETA is > 30 days after plan ETA
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 6.3_

  - [ ]* 1.6 Write property test for `calcPracticalEta` — fallback behaviour
    - **Property 2: When activeDays < 3, adjustedPace equals plannedDailyHours and usedFallback is true**
    - **Validates: Requirements 1.3**

  - [ ]* 1.7 Write property test for `calcPracticalEta` — consistency multiplier
    - **Property 3: adjustedPace is always between 0.4 × medianDailyHours and medianDailyHours (inclusive) when activeDays >= 3**
    - **Validates: Requirements 1.4**

  - [ ]* 1.8 Write unit tests for `calcPracticalEta` edge cases
    - Test: `hoursRemaining === 0` → both ETA dates equal today
    - Test: `adjustedPace === 0` and `hoursRemaining > 0` → null ETA dates
    - Test: confidence classification for activeDays 0, 4, 10
    - Test: `isBehindPlan` flag set when practical ETA > plan ETA by 31 days
    - _Requirements: 1.5, 1.6, 5.1, 5.2, 5.3_

- [x] 2. Checkpoint — ensure `lib/pace.ts` compiles and all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Redesign `components/EtaCard.tsx`
  - [x] 3.1 Update props interface — remove `weeklyTargetHours`, add `weeks: WeekData[]`
    - Remove `weeklyTargetHours` from `EtaCardProps`
    - Add `weeks: WeekData[]` to `EtaCardProps`
    - Derive `plannedDailyHours` internally via `getPlannedDailyHours(weeks)`
    - Call `calcPracticalEta` with the derived `plannedDailyHours`
    - _Requirements: 2.4, 2.5, 4.1_

  - [x] 3.2 Implement full card layout with multi-parameter display
    - Update heading to "📊 COMPLETION FORECAST"
    - Show completion percentage (`hoursTotal` basis)
    - Two-column ETA row: practical ETA (at your pace) and plan ETA (at plan pace), each with their daily hours rate
    - Parameter row: median pace, consistency % (warning color when < 30%), active days / 28, hours remaining
    - Conditional behind-plan warning when `isBehindPlan` is true
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1_

  - [x] 3.3 Implement confidence indicator in card footer
    - Render confidence label ("High" / "Medium" / "Low") with color dot (green / amber / red)
    - _Requirements: 5.4_

  - [x] 3.4 Implement compact mode
    - Show emoji `📊`, practical ETA date, adjusted pace per day, and "FORECAST" label
    - _Requirements: 4.2_

  - [ ]* 3.5 Write unit tests for `EtaCard` rendering
    - Test: heading renders as "📊 COMPLETION FORECAST"
    - Test: behind-plan warning appears when `isBehindPlan` is true
    - Test: consistency warning color applied when consistency < 30%
    - Test: "No plan set" shown when `weeks` is empty
    - _Requirements: 2.5, 3.3, 3.4, 4.1_

- [x] 4. Wire updated props in parent components
  - [x] 4.1 Update `app/dashboard/DashboardClient.tsx`
    - Remove `weeklyTargetHours` prop from `<EtaCard>` call
    - Add `weeks={weeks}` prop (the `weeks` variable is already available in `DashboardClient`)
    - _Requirements: 2.1_

  - [x] 4.2 Update `app/activity/ActivityClient.tsx`
    - Add `weeks: WeekData[]` to `ActivityClient`'s props interface
    - Pass `weeks={weeks}` to `<EtaCard>`
    - _Requirements: 2.1_

  - [x] 4.3 Update `app/activity/page.tsx`
    - Import `weeklyPlan` (or equivalent `WeekData[]` source)
    - Pass `weeks={weeklyPlan}` to `<ActivityClient>`
    - _Requirements: 2.1_

- [x] 5. Final checkpoint — ensure all tests pass and no type errors
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Existing `calcPace`, `formatEta`, `formatPace`, and `formatHours` exports in `pace.ts` must be retained for backward compatibility
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases
