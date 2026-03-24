"use client";
import React, { useState } from "react";
import type { WeekData } from "@/app/weekly/page";
import {
  calcSimpleEta,
  getPlanEndDate,
  formatEta,
  formatHours,
} from "@/lib/pace";
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
  targetDate?: string;           // "YYYY-MM-DD"
  onTargetDateChange?: (date: string) => void;
  // Enhanced parameters
  subjectData?: Record<string, { totalHours: number; plannedHours: number }>;
  userId?: string;
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
  userId
}: EtaCardProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(targetDate ?? "");
  const [realisticResult, setRealisticResult] = useState<RealisticEtaResult | null>(null);

  const planEndDate = getPlanEndDate(weeks);
  const result = calcSimpleEta(completedMap, durationMap, hoursRemaining, lectureIdSet);
  const { avgDailyHours, totalHoursStudied, daysSinceStart, daysToFinish, etaDate, noData } = result;

  const pct = hoursTotal > 0 ? Math.round(((hoursTotal - hoursRemaining) / hoursTotal) * 100) : 0;

  // Calculate realistic ETA when component mounts or data changes
  React.useEffect(() => {
    if (userId && weeks.length > 0) {
      const realistic = RealisticEtaCalculator.calculateRealisticEta(
        completedMap,
        durationMap,
        hoursTotal,
        weeks
      );

      setRealisticResult(realistic);

      // Save to storage if we have a userId
      if (userId) {
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
            pessimistic: realistic.estimatedCompletion
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
            adjustedDays: realistic.studyPattern.bulkUploadDays
          },
          calculationMethod: realistic.calculationMethod,
          lastUpdated: realistic.lastUpdated,
          dataQuality: realistic.reliabilityScore > 0.8 ? "excellent" : 
                      realistic.reliabilityScore > 0.6 ? "good" : 
                      realistic.reliabilityScore > 0.4 ? "fair" : "poor"
        }, totalHoursStudied).catch(console.error);
      }
    }
  }, [completedMap, durationMap, hoursRemaining, hoursTotal, weeks, userId, lectureIdSet, totalHoursStudied, avgDailyHours]);

  // Target date calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetMs = targetDate ? new Date(targetDate).getTime() : null;
  const daysUntilTarget = targetMs ? Math.ceil((targetMs - today.getTime()) / 86400000) : null;
  const requiredDailyHours = (daysUntilTarget && daysUntilTarget > 0 && hoursRemaining > 0)
    ? hoursRemaining / daysUntilTarget
    : null;
  const targetPassed = daysUntilTarget !== null && daysUntilTarget <= 0;

  function saveTarget() {
    if (onTargetDateChange) onTargetDateChange(inputVal);
    setEditing(false);
  }

  // Use realistic result if available, otherwise fall back to simple
  const displayEta = realisticResult?.estimatedCompletion || etaDate;
  const displayDaysToFinish = realisticResult?.daysToComplete || daysToFinish;
  const displayAvgHours = realisticResult?.sustainablePace || avgDailyHours;
  const displayConfidence = realisticResult?.confidence || "low";

  if (compact) {
    return (
      <div className="text-center">
        <div className="text-3xl font-semibold mb-2" style={{ color: noData ? "var(--muted)" : "var(--accent)" }}>
          {noData ? "--" : formatEta(displayEta, displayDaysToFinish)}
        </div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {noData ? "No activity yet" : `${formatHours(displayAvgHours)}/day avg`}
        </p>
        {realisticResult && (
          <div className="mt-1 space-y-1">
            <span className="text-xs px-2 py-0.5 rounded-md font-medium block" 
              style={{
                background: displayConfidence === "high" || displayConfidence === "very-high" 
                  ? "var(--tint-green)" 
                  : displayConfidence === "medium" 
                  ? "rgba(245,158,11,0.1)" 
                  : "rgba(239,68,68,0.1)",
                color: displayConfidence === "high" || displayConfidence === "very-high"
                  ? "var(--green)"
                  : displayConfidence === "medium"
                  ? "#f59e0b"
                  : "var(--red)"
              }}>
              {displayConfidence} confidence
            </span>
            {realisticResult.studyPattern.bulkUploadDays > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-md font-medium block"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  color: "#f59e0b"
                }}>
                Bulk patterns detected
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass p-5 relative overflow-hidden">
      <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />

      {/* Heading row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>📊 COMPLETION FORECAST</p>
        <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>{pct}% done</p>
      </div>

      {/* ETA — two columns */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* At your pace */}
        <div className="rounded-xl p-3" style={{ background: "var(--tint-accent)", border: "1px solid var(--border)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>🏃 at your pace</p>
          {noData ? (
            <p className="text-xs" style={{ color: "var(--muted)" }}>Mark lectures done</p>
          ) : (
            <>
              <p className="text-base font-bold leading-tight" style={{ color: "var(--green)" }}>{formatEta(etaDate, daysToFinish)}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                {formatHours(avgDailyHours)}/day avg · since 23 Feb
              </p>
            </>
          )}
        </div>
        {/* Plan schedule */}
        <div className="rounded-xl p-3" style={{ background: "var(--tint-accent)", border: "1px solid var(--border)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>📅 plan schedule</p>
          {planEndDate ? (
            <>
              <p className="text-base font-bold leading-tight" style={{ color: "var(--accent2)" }}>
                {planEndDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>plan end date</p>
            </>
          ) : (
            <p className="text-xs" style={{ color: "var(--muted)" }}>No plan loaded</p>
          )}
        </div>
      </div>

      {/* Target date section */}
      <div className="rounded-xl p-3 mb-3" style={{ background: "var(--tint-accent)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>🎯 TARGET DATE</p>
          <button
            onClick={() => { setInputVal(targetDate ?? ""); setEditing((v) => !v); }}
            className="text-xs px-2 py-0.5 rounded-lg hover:opacity-80 transition-all"
            style={{ background: "rgba(99,120,255,0.12)", color: "var(--accent2)", border: "1px solid rgba(99,120,255,0.2)" }}
          >
            {targetDate ? "change" : "set date"}
          </button>
        </div>

        {editing && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="date"
              value={inputVal}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 text-xs px-2 py-1 rounded-lg outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <button
              onClick={saveTarget}
              disabled={!inputVal}
              className="text-xs px-3 py-1 rounded-lg font-semibold hover:opacity-80 transition-all"
              style={{ background: "linear-gradient(135deg, #6378ff, #8b5cf6)", color: "white", opacity: inputVal ? 1 : 0.4 }}
            >
              Save
            </button>
          </div>
        )}

        {!editing && targetDate && (
          <div className="mt-1">
            {targetPassed ? (
              <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>
                Target date passed — update it
              </p>
            ) : (
              <>
                <p className="text-sm font-bold" style={{ color: "var(--accent2)" }}>
                  {new Date(targetDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  <span className="font-normal text-xs ml-2" style={{ color: "var(--muted)" }}>({daysUntilTarget} days away)</span>
                </p>
                {requiredDailyHours !== null && (
                  <p className="text-xs mt-1" style={{ color: requiredDailyHours > (avgDailyHours || requiredDailyHours) * 1.3 ? "#f59e0b" : "var(--green)" }}>
                    Need {formatHours(requiredDailyHours)}/day to hit this target
                    {!noData && avgDailyHours > 0 && requiredDailyHours > avgDailyHours * 1.3 && " — ambitious!"}
                    {!noData && avgDailyHours > 0 && requiredDailyHours <= avgDailyHours && " ✓ on track"}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {!editing && !targetDate && (
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Set a target to see required daily hours</p>
        )}
      </div>

      {/* Params row */}
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--tint-accent)", color: "var(--muted)" }}>
          📈 {formatHours(avgDailyHours)}/day avg
        </span>
        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--tint-accent)", color: "var(--muted)" }}>
          📚 {formatHours(totalHoursStudied)} studied
        </span>
        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--tint-accent)", color: "var(--muted)" }}>
          🗓 {daysSinceStart} days since 23 Feb
        </span>
        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--tint-accent)", color: "var(--muted)" }}>
          ⏳ {formatHours(hoursRemaining)} left
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: noData ? "var(--muted)" : "var(--green)" }} />
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {noData ? "No data yet — mark lectures done" : `finishes ${formatEta(etaDate, daysToFinish)}`}
        </p>
      </div>
    </div>
  );
}
