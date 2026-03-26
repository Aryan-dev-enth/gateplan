"use client";
import React, { useState } from "react";
import type { WeekData } from "@/app/weekly/page";
import { calcSimpleEta, getPlanEndDate, formatEta, formatHours } from "@/lib/pace";
import { RealisticEtaCalculator, RealisticEtaResult } from "@/lib/realisticEta";
import { EtaStorage } from "@/lib/etaStorage";

interface EtaCardProps {
  completedMap: Record<string, number | false>;
  durationMap: Record<string, number>;
  hoursRemaining: number;
  hoursTotal: number;
  weeks: WeekData[];
  lectureIdSet?: Set<string>;
  compact?: boolean;
  targetDate?: string;
  onTargetDateChange?: (date: string) => void;
  subjectData?: Record<string, { totalHours: number; plannedHours: number }>;
  userId?: string;
}

function confidenceColor(c: string): string {
  if (c === "high" || c === "very-high") return "var(--green)";
  if (c === "medium") return "#f59e0b";
  return "var(--red)";
}

function confidenceBg(c: string): string {
  if (c === "high" || c === "very-high") return "var(--tint-green)";
  if (c === "medium") return "rgba(245,158,11,0.1)";
  return "rgba(239,68,68,0.08)";
}

export default function EtaCard({
  completedMap,
  durationMap,
  hoursRemaining,
  hoursTotal,
  weeks,
  lectureIdSet,
  compact = false,
  targetDate,
  onTargetDateChange,
  subjectData = {},
  userId,
}: EtaCardProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(targetDate ?? "");
  const [realisticResult, setRealisticResult] = useState<RealisticEtaResult | null>(null);

  const planEndDate = getPlanEndDate(weeks);
  const result = calcSimpleEta(completedMap, durationMap, hoursRemaining, lectureIdSet);
  const { avgDailyHours, totalHoursStudied, daysSinceStart, daysToFinish, etaDate, noData } = result;
  const pct = hoursTotal > 0 ? Math.round(((hoursTotal - hoursRemaining) / hoursTotal) * 100) : 0;

  React.useEffect(() => {
    if (userId && weeks.length > 0) {
      const realistic = RealisticEtaCalculator.calculateRealisticEta(
        completedMap, durationMap, hoursTotal, weeks
      );
      setRealisticResult(realistic);
      EtaStorage.saveEtaMetrics(userId, {
        etaDate: realistic.estimatedCompletion,
        daysToFinish: realistic.daysToComplete,
        confidence: realistic.confidence,
        avgDailyHours: realistic.currentPace,
        medianDailyHours: realistic.sustainablePace,
        consistencyScore: realistic.studyPattern.consistencyScore,
        productivityTrend: realistic.studyPattern.momentumScore > 0.6 ? "improving" :
          realistic.studyPattern.momentumScore < 0.4 ? "declining" : "stable",
        plannedDailyHours: realistic.planRequiredPace,
        planEfficiency: realistic.currentPace / realistic.planRequiredPace,
        isBehindPlan: realistic.backlogRate > 0,
        daysBehindPlan: realistic.daysToComplete ? Math.floor(realistic.daysToComplete * 0.1) : null,
        subjectPerformance: {},
        predictedCompletionRange: {
          optimistic: realistic.estimatedCompletion,
          realistic: realistic.estimatedCompletion,
          pessimistic: realistic.estimatedCompletion,
        },
        totalHoursStudied,
        activeDays: Math.floor(realistic.studyPattern.studyDayFrequency * 21),
        streakDays: 0,
        longestStreak: 0,
        adaptiveStats: {
          distributionApplied: realistic.studyPattern.bulkUploadDays > 0,
          originalAverage: avgDailyHours,
          adjustedAverage: realistic.sustainablePace,
          totalExcessHours: realistic.studyPattern.bulkUploadDays * 2,
          adjustedDays: realistic.studyPattern.bulkUploadDays,
        },
        calculationMethod: realistic.calculationMethod,
        lastUpdated: realistic.lastUpdated,
        dataQuality: realistic.reliabilityScore > 0.8 ? "excellent" :
          realistic.reliabilityScore > 0.6 ? "good" :
          realistic.reliabilityScore > 0.4 ? "fair" : "poor",
      }, totalHoursStudied).catch(console.error);
    }
  }, [completedMap, durationMap, hoursRemaining, hoursTotal, weeks, userId, lectureIdSet, totalHoursStudied, avgDailyHours]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetMs = targetDate ? new Date(targetDate).getTime() : null;
  const daysUntilTarget = targetMs ? Math.ceil((targetMs - today.getTime()) / 86400000) : null;
  const requiredDailyHours = (daysUntilTarget && daysUntilTarget > 0 && hoursRemaining > 0)
    ? hoursRemaining / daysUntilTarget : null;
  const targetPassed = daysUntilTarget !== null && daysUntilTarget <= 0;

  const displayEta = realisticResult?.estimatedCompletion || etaDate;
  const displayDaysToFinish = realisticResult?.daysToComplete || daysToFinish;
  const displayAvgHours = realisticResult?.sustainablePace || avgDailyHours;
  const displayConfidence = realisticResult?.confidence || "low";

  function saveTarget() {
    if (onTargetDateChange) onTargetDateChange(inputVal);
    setEditing(false);
  }

  // ── Compact (used in metric card) ─────────────────────────────────────────
  if (compact) {
    return (
      <div className="text-center">
        <div className="text-3xl font-bold mb-1"
          style={{ color: noData ? "var(--muted)" : "var(--accent)" }}>
          {noData ? "—" : formatEta(displayEta, displayDaysToFinish)}
        </div>
        <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>
          {noData ? "No activity yet" : `${formatHours(displayAvgHours)}/day avg`}
        </p>
        {realisticResult && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: confidenceBg(displayConfidence), color: confidenceColor(displayConfidence) }}>
              {displayConfidence} confidence
            </span>
            {realisticResult.studyPattern.bulkUploadDays > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                bulk patterns detected
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Full card ──────────────────────────────────────────────────────────────
  return (
    <div className="glass p-5 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          Completion Forecast
        </p>
        <span className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
          {pct}% done
        </span>
      </div>

      {/* Main ETA + plan end — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <p className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>At your pace</p>
          {noData ? (
            <p className="text-xs" style={{ color: "var(--muted)" }}>Mark lectures done to calculate</p>
          ) : (
            <>
              <p className="text-base font-bold" style={{ color: "var(--green)" }}>
                {formatEta(etaDate, daysToFinish)}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                {formatHours(avgDailyHours)}/day · since 23 Feb
              </p>
              {realisticResult && (
                <span className="inline-block mt-1.5 text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: confidenceBg(displayConfidence), color: confidenceColor(displayConfidence) }}>
                  {displayConfidence} confidence
                </span>
              )}
            </>
          )}
        </div>

        <div className="rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <p className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>Plan end date</p>
          {planEndDate ? (
            <>
              <p className="text-base font-bold" style={{ color: "var(--accent2)" }}>
                {planEndDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>scheduled end</p>
            </>
          ) : (
            <p className="text-xs" style={{ color: "var(--muted)" }}>No plan loaded</p>
          )}
        </div>
      </div>

      {/* Target date */}
      <div className="rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>Target date</p>
          <button
            onClick={() => { setInputVal(targetDate ?? ""); setEditing((v) => !v); }}
            className="text-xs px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
            style={{ background: "var(--tint-accent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
            {editing ? "cancel" : targetDate ? "change" : "set date"}
          </button>
        </div>

        {editing && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={inputVal}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 rounded-lg outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <button
              onClick={saveTarget}
              disabled={!inputVal}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
              style={{
                background: "linear-gradient(135deg, #6378ff, #8b5cf6)",
                color: "white",
                opacity: inputVal ? 1 : 0.4,
              }}>
              Save
            </button>
          </div>
        )}

        {!editing && targetDate && !targetPassed && (
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-bold" style={{ color: "var(--accent2)" }}>
                {new Date(targetDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              <span className="text-xs" style={{ color: "var(--muted)" }}>{daysUntilTarget} days away</span>
            </div>
            {requiredDailyHours !== null && (
              <p className="text-xs mt-1"
                style={{ color: requiredDailyHours > (avgDailyHours || requiredDailyHours) * 1.3 ? "#f59e0b" : "var(--green)" }}>
                Need {formatHours(requiredDailyHours)}/day to hit this
                {!noData && avgDailyHours > 0 && requiredDailyHours > avgDailyHours * 1.3 && " — ambitious"}
                {!noData && avgDailyHours > 0 && requiredDailyHours <= avgDailyHours && " — on track ✓"}
              </p>
            )}
          </div>
        )}

        {!editing && targetDate && targetPassed && (
          <p className="text-sm font-semibold" style={{ color: "var(--red)" }}>Target date passed — update it</p>
        )}

        {!editing && !targetDate && (
          <p className="text-xs" style={{ color: "var(--muted)" }}>Set a target to see required daily pace</p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Avg/day", val: noData ? "—" : formatHours(avgDailyHours) },
          { label: "Studied", val: formatHours(totalHoursStudied) },
          { label: "Days active", val: `${daysSinceStart}d` },
          { label: "Remaining", val: formatHours(hoursRemaining) },
        ].map(({ label, val }) => (
          <div key={label} className="flex items-center justify-between px-3 py-2 rounded-lg"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Bulk pattern warning */}
      {(realisticResult?.studyPattern?.bulkUploadDays ?? 0) > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <span className="text-xs" style={{ color: "#f59e0b" }}>
            Bulk upload patterns detected — pace estimate adjusted
          </span>
        </div>
      )}
    </div>
  );
}
