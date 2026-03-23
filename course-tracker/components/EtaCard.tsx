"use client";
import { useState } from "react";
import type { WeekData } from "@/app/weekly/page";
import {
  calcSimpleEta,
  getPlanEndDate,
  formatEta,
  formatHours,
} from "@/lib/pace";

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
}: EtaCardProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(targetDate ?? "");

  const planEndDate = getPlanEndDate(weeks);
  const result = calcSimpleEta(completedMap, durationMap, hoursRemaining, lectureIdSet);
  const { avgDailyHours, totalHoursStudied, daysSinceStart, daysToFinish, etaDate, noData } = result;

  const pct = hoursTotal > 0 ? Math.round(((hoursTotal - hoursRemaining) / hoursTotal) * 100) : 0;

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

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: "var(--tint-accent)", border: "1px solid var(--border)" }}>
        <span className="text-sm">📊</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: noData ? "var(--muted)" : "var(--green)" }}>
            {noData ? "No activity yet" : formatEta(etaDate, daysToFinish)}
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {noData ? "mark lectures done to calculate" : `${formatHours(avgDailyHours)}/day avg · ${daysSinceStart} days tracked`}
          </p>
        </div>
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
