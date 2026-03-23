# Requirements Document

## Introduction

GatePlan currently shows a "Syllabus Completion ETA" card with two estimates: one based on a 14-day rolling window of lecture completions and one based on the weekly target hours. The existing approach is vulnerable to binge-logging distortion — if a user logs all their study in a single day, the rolling average spikes unrealistically and produces an over-optimistic ETA.

This feature redesigns the ETA card to produce a **practical, multi-parameter ETA** that is resistant to binge-logging, incorporates the weekly schedule plan, and surfaces the key parameters driving the estimate so the user can understand and trust the number. The card heading is also updated to better reflect its purpose.

---

## Glossary

- **ETA_Card**: The UI component (`components/EtaCard.tsx`) that displays completion time estimates on the dashboard.
- **ETA_Engine**: The calculation module (`lib/pace.ts`) that computes ETA values from input parameters.
- **Completion_Log**: The `completedLectures` record in `UserData` — a map of lecture ID to Unix timestamp (ms) when the lecture was marked done, or `false` if unchecked.
- **Weekly_Plan**: The structured schedule in `lib/weeklyPlan.json` that lists planned study hours per day, broken down by subject and module.
- **Weekly_Target_Hours**: The sum of all task hours across all days in the current or upcoming week of the Weekly_Plan.
- **Planned_Daily_Hours**: The average daily study hours derived from the Weekly_Plan (`weeklyTargetHours / 7`).
- **Active_Study_Days**: The number of distinct calendar days within a rolling window on which at least one lecture was completed.
- **Binge_Day**: A calendar day on which the user logged an unusually high number of hours relative to their median daily output.
- **Consistency_Score**: A value between 0 and 1 representing how regularly the user studies, calculated as `activeDays / windowDays`.
- **Median_Daily_Hours**: The median of non-zero daily study hours within the rolling window, used as a binge-resistant pace estimate.
- **Practical_ETA**: The ETA produced by the ETA_Engine using the median-based, binge-resistant pace calculation.
- **Plan_ETA**: The ETA produced by the ETA_Engine using the Planned_Daily_Hours from the Weekly_Plan.
- **Hours_Remaining**: Total course hours minus hours of completed lectures, scoped to core (non-extra) subjects only.
- **Rolling_Window**: A configurable lookback period (default 28 days) used to sample recent study activity.

---

## Requirements

### Requirement 1: Binge-Resistant Pace Calculation

**User Story:** As a GATE aspirant, I want the ETA to reflect my realistic study pace even when I occasionally log all my study in one day, so that the estimate is not artificially optimistic after a binge session.

#### Acceptance Criteria

1. WHEN the ETA_Engine calculates the Practical_ETA, THE ETA_Engine SHALL compute daily study hours for each calendar day in the Rolling_Window by summing the durations of lectures completed on that day.
2. WHEN computing the Practical_ETA, THE ETA_Engine SHALL use the Median_Daily_Hours of non-zero study days within the Rolling_Window as the base pace, rather than the arithmetic mean.
3. WHEN the Rolling_Window contains fewer than 3 Active_Study_Days, THE ETA_Engine SHALL fall back to the Planned_Daily_Hours as the base pace for the Practical_ETA.
4. THE ETA_Engine SHALL apply a Consistency_Score multiplier to the Median_Daily_Hours such that `adjustedPace = medianDailyHours × (0.4 + 0.6 × consistencyScore)`, where `consistencyScore = activeDays / windowDays`.
5. WHEN the Hours_Remaining is zero, THE ETA_Engine SHALL return a completion date equal to the current date for both Practical_ETA and Plan_ETA.
6. IF the adjusted pace is zero and Hours_Remaining is greater than zero, THEN THE ETA_Engine SHALL return a null ETA date and surface a "No data yet" state to the ETA_Card.

---

### Requirement 2: Weekly Plan Integration

**User Story:** As a GATE aspirant, I want the ETA to factor in my weekly study schedule, so that the plan-based estimate reflects what I actually intend to study each week.

#### Acceptance Criteria

1. WHEN the Weekly_Plan contains at least one week with scheduled tasks, THE ETA_Engine SHALL derive the Planned_Daily_Hours as `sum of all task hours in the current or next scheduled week / 7`.
2. WHEN the current date falls within a scheduled week in the Weekly_Plan, THE ETA_Engine SHALL use that week's total hours to compute Planned_Daily_Hours.
3. WHEN the current date does not fall within any scheduled week, THE ETA_Engine SHALL use the most recently passed week's total hours as the Planned_Daily_Hours.
4. THE ETA_Card SHALL display the Plan_ETA alongside the Practical_ETA so the user can compare both estimates.
5. WHEN no Weekly_Plan data is available and weeklyTargetHours is zero, THE ETA_Card SHALL display "No plan set" in the plan-pace section.

---

### Requirement 3: Multi-Parameter Display

**User Story:** As a GATE aspirant, I want to see the key parameters driving my ETA on the card, so that I understand why the estimate is what it is and can identify what to improve.

#### Acceptance Criteria

1. THE ETA_Card SHALL display the following parameters visibly on the card: Median_Daily_Hours (or adjusted pace), Consistency_Score as a percentage, Active_Study_Days count within the Rolling_Window, and Hours_Remaining.
2. THE ETA_Card SHALL display the Planned_Daily_Hours derived from the Weekly_Plan so the user can compare actual pace against planned pace.
3. WHEN the Consistency_Score is below 0.3, THE ETA_Card SHALL highlight the consistency parameter with a warning color to indicate low study regularity.
4. WHEN the Practical_ETA date is more than 30 days later than the Plan_ETA date, THE ETA_Card SHALL display a visual indicator showing the user is behind their plan.
5. THE ETA_Card SHALL display the overall course completion percentage alongside the ETA figures.

---

### Requirement 4: Updated Card Heading

**User Story:** As a GATE aspirant, I want the ETA card heading to clearly describe what the card shows, so that I immediately understand its purpose.

#### Acceptance Criteria

1. THE ETA_Card SHALL display the heading "📊 COMPLETION FORECAST" instead of "🎯 SYLLABUS COMPLETION ETA".
2. WHEN the ETA_Card is rendered in compact mode, THE ETA_Card SHALL display a shortened label consistent with the updated heading style.

---

### Requirement 5: Confidence Indicator

**User Story:** As a GATE aspirant, I want to know how reliable the ETA estimate is, so that I can decide how much weight to give it.

#### Acceptance Criteria

1. THE ETA_Engine SHALL classify confidence as "high" WHEN Active_Study_Days is 7 or more within the Rolling_Window AND the Rolling_Window contains data spanning at least 14 days.
2. THE ETA_Engine SHALL classify confidence as "medium" WHEN Active_Study_Days is between 3 and 6 (inclusive) within the Rolling_Window.
3. THE ETA_Engine SHALL classify confidence as "low" WHEN Active_Study_Days is fewer than 3 within the Rolling_Window.
4. THE ETA_Card SHALL render the confidence label and a corresponding color indicator (green for high, amber for medium, red for low) in the card footer.

---

### Requirement 6: Rolling Window Configuration

**User Story:** As a GATE aspirant, I want the ETA to use a longer history window so that occasional off-days do not disproportionately affect the estimate.

#### Acceptance Criteria

1. THE ETA_Engine SHALL use a default Rolling_Window of 28 days (instead of the current 14 days) when computing the Practical_ETA.
2. THE ETA_Engine SHALL expose the Rolling_Window size as a named constant so it can be adjusted without modifying calculation logic.
3. WHEN the Completion_Log contains fewer completed lectures than the Rolling_Window days, THE ETA_Engine SHALL use all available data rather than returning a zero pace.
