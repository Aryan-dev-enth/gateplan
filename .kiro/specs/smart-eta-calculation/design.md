# Design Document: Smart ETA Calculation

## Overview

This feature replaces the existing binge-prone ETA calculation with a **practical, multi-parameter completion forecast**. The core change is moving from a mean-based lecture-count pace to a **median-based, hours-based pace** over a 28-day rolling window, multiplied by a consistency score. The ETA card is also redesigned to surface the parameters driving the estimate.

The two main artifacts being changed are:
- `lib/pace.ts` — the ETA calculation engine
- `components/EtaCard.tsx` — the display component

Both `DashboardClient.tsx` and `ActivityClient.tsx` pass data into `EtaCard` and will need minor prop updates to supply `weeks` data.

---

## Architecture

Data flows from static JSON and user state into the engine, then into the card:

```mermaid
flowchart LR
    WP[weeklyPlan.json\nWeekData\[\]] -->|weeks prop| EC
    CM[completedLectures\nRecord<id, ts|false>] -->|completedMap| EC
    DM[durationMap\nRecord<id, seconds>] -->|durationMap| EC
    HR[hoursRemaining\nnumber] -->|hoursRemaining| EC
    HT[hoursTotal\nnumber] -->|hoursTotal| EC

    subgraph pace.ts
        GPDH[getPlannedDailyHours\nweeks → number]
        CPETA[calcPracticalEta\n→ PracticalEtaResult]
    end

    WP -->|weeks| GPDH
    GPDH -->|plannedDailyHours| CPETA
    CM & DM & HR -->|inputs| CPETA
    CPETA -->|PracticalEtaResult| EC[EtaCard.tsx]
```

`EtaCard` calls both `getPlannedDailyHours` and `calcPracticalEta` internally. The parent components (`DashboardClient`, `ActivityClient`) only need to pass the raw data — they do not perform any ETA math themselves.

---

## Components and Interfaces

### `lib/pace.ts` — new exports

#### Constant

```ts
export const ROLLING_WINDOW_DAYS = 28;
```

#### `getPlannedDailyHours(weeks: WeekData[]): number`

Finds the current or most-recently-passed week from the `WeekData` array and returns `totalWeekHours / 7`.

- Iterates weeks to find one whose date range contains today.
- If none contains today, picks the week whose end date is the most recent past date.
- If `weeks` is empty, returns `0`.

```ts
export function getPlannedDailyHours(weeks: WeekData[]): number
```

#### `PracticalEtaResult` interface

```ts
export interface PracticalEtaResult {
  // Pace inputs
  medianDailyHours: number;       // median of non-zero daily hours in window
  consistencyScore: number;       // activeDays / ROLLING_WINDOW_DAYS
  adjustedPace: number;           // medianDailyHours × (0.4 + 0.6 × consistencyScore)
  activeDays: number;             // distinct calendar days with completions in window
  hoursRemaining: number;         // passed through from input

  // Practical ETA (median-based)
  daysToFinish: number | null;
  etaDate: Date | null;

  // Plan ETA (planned daily hours-based)
  plannedDailyHours: number;
  daysToFinishPlan: number | null;
  etaDatePlan: Date | null;

  // Meta
  confidence: "high" | "medium" | "low";
  isBehindPlan: boolean;          // practicalEta > planEta by more than 30 days
  usedFallback: boolean;          // true when fewer than 3 active days → used plannedDailyHours
}
```

#### `calcPracticalEta(...)` signature

```ts
export function calcPracticalEta(
  completedMap: Record<string, number | false>,
  durationMap: Record<string, number>,   // seconds per lecture
  hoursRemaining: number,
  plannedDailyHours: number,
  lectureIdSet?: Set<string>,
): PracticalEtaResult
```

Internal steps:
1. Collect all window entries (completions within last `ROLLING_WINDOW_DAYS` days, filtered by `lectureIdSet`).
2. Build a `Map<dateString, hours>` by summing `durationMap[id] / 3600` per calendar day.
3. Extract the array of non-zero daily hours values.
4. Compute `medianDailyHours` = median of that array.
5. Compute `activeDays` = count of distinct days with completions.
6. Compute `consistencyScore = activeDays / ROLLING_WINDOW_DAYS`.
7. If `activeDays < 3`, set `adjustedPace = plannedDailyHours` (fallback), `usedFallback = true`.
8. Otherwise `adjustedPace = medianDailyHours × (0.4 + 0.6 × consistencyScore)`.
9. Compute practical ETA from `adjustedPace` and `hoursRemaining`.
10. Compute plan ETA from `plannedDailyHours` and `hoursRemaining`.
11. Classify confidence per requirements 5.1–5.3.
12. Set `isBehindPlan` if practical ETA date is more than 30 days after plan ETA date.

The existing `calcPace`, `formatEta`, `formatPace`, and `formatHours` exports are retained for backward compatibility.

---

### `components/EtaCard.tsx` — updated props

```ts
interface EtaCardProps {
  completedMap: Record<string, number | false>;
  durationMap: Record<string, number>;
  hoursRemaining: number;
  hoursTotal: number;
  weeks: WeekData[];               // NEW — replaces weeklyTargetHours
  lectureIdSet?: Set<string>;
  compact?: boolean;
}
```

`weeklyTargetHours` is removed; the card derives `plannedDailyHours` internally via `getPlannedDailyHours(weeks)`.

#### Full card layout (non-compact)

```
┌─────────────────────────────────────────────┐
│ 📊 COMPLETION FORECAST          [pct]% done │
├──────────────────────┬──────────────────────┤
│  at your pace        │  at plan pace        │
│  <practical ETA>     │  <plan ETA>          │
│  Xh Ym/day (median)  │  Xh Ym/day (planned) │
├──────────────────────┴──────────────────────┤
│  Median pace: Xh Ym/day                     │
│  Consistency: XX%  (warning if < 30%)       │
│  Active days: N / 28                        │
│  Hours remaining: Xh Ym                     │
│  [⚠ Behind plan by ~N days]  (conditional) │
├─────────────────────────────────────────────┤
│  ● High/Medium/Low confidence               │
└─────────────────────────────────────────────┘
```

#### Compact card layout

Displays emoji `📊`, practical ETA date, and adjusted pace per day. Uses "FORECAST" as the shortened label.

---

### `app/dashboard/DashboardClient.tsx`

Remove `weeklyTargetHours` from the `<EtaCard>` call, add `weeks={weeks}`. The `weeks` prop is already received by `DashboardClient` from its server component.

### `app/activity/ActivityClient.tsx`

Add `weeks: WeekData[]` to `ActivityClient`'s props interface. Pass it down to `<EtaCard weeks={weeks} ...>`. The server component (`activity/page.tsx`) will need to import and pass `weeklyPlan` data.

---

## Data Models

### `WeekData` (existing, from `app/weekly/page.tsx`)

```ts
interface DayTask {
  subject: string;
  module: string;
  lectureRefs: string[];
  hours: number;
  lectureIds: string[];
}

interface DayData {
  date: string;   // "YYYY-MM-DD"
  label: string;
  tasks: DayTask[];
}

export interface WeekData {
  weekId: string;
  label: string;
  days: DayData[];
}
```

### Week selection logic for `getPlannedDailyHours`

A week's date range is derived from its `days` array: `firstDay.date` to `lastDay.date`. Today is compared against this range using `YYYY-MM-DD` string comparison (locale-independent).

```
today in [week.days[0].date, week.days[last].date]  → use this week
no match → use week with largest lastDay.date that is still ≤ today
no past week → use first future week (graceful fallback)
```

Total hours for a week = `sum of task.hours across all days and all tasks`.

### Median calculation

```
medianOf(values: number[]): number
  sort ascending
  if length is odd  → middle element
  if length is even → average of two middle elements
  if empty          → 0
```

### Confidence thresholds (updated from current)

| Condition | Confidence |
|---|---|
| `activeDays >= 7` AND window spans ≥ 14 days of data | `"high"` |
| `activeDays >= 3 && activeDays <= 6` | `"medium"` |
| `activeDays < 3` | `"low"` |

"Window spans ≥ 14 days of data" means the earliest completion timestamp in the window is at least 14 days before now.

---
