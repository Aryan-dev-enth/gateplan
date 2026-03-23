"use client";
import { useState, useRef } from "react";
import type { Checkpoint, WeeklyPlan } from "@/lib/store";

interface Props {
  plan: WeeklyPlan;
  onUpdate: (plan: WeeklyPlan) => void;
}

export default function CheckpointOverlay({ plan, onUpdate }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [labelInput, setLabelInput] = useState("");
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest(".cp-pin")) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPos({ x, y });
    setLabelInput("");
  }

  function confirmCheckpoint() {
    if (!pendingPos) return;
    const cp: Checkpoint = {
      id: Date.now().toString(),
      x: pendingPos.x,
      y: pendingPos.y,
      label: labelInput.trim() || "Checkpoint",
      done: false,
    };
    onUpdate({ ...plan, checkpoints: [...plan.checkpoints, cp] });
    setPendingPos(null);
  }

  function toggleCheckpoint(id: string) {
    onUpdate({
      ...plan,
      checkpoints: plan.checkpoints.map((cp) => cp.id === id ? { ...cp, done: !cp.done } : cp),
    });
  }

  function deleteCheckpoint(id: string) {
    onUpdate({ ...plan, checkpoints: plan.checkpoints.filter((cp) => cp.id !== id) });
  }

  return (
    <div className="relative w-full select-none" ref={containerRef} onClick={handleImageClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={plan.imageDataUrl} alt="Weekly plan" className="w-full rounded-xl" draggable={false} />

      {plan.checkpoints.map((cp) => (
        <div
          key={cp.id}
          className="cp-pin absolute group"
          style={{ left: `${cp.x}%`, top: `${cp.y}%`, transform: "translate(-50%, -50%)", zIndex: 10 }}
        >
          {/* Ripple ring */}
          {!cp.done && (
            <div className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "rgba(99,120,255,0.3)", animationDuration: "2s" }} />
          )}

          <button
            onClick={(e) => { e.stopPropagation(); toggleCheckpoint(cp.id); }}
            title={cp.label}
            className="relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 hover:scale-110"
            style={{
              background: cp.done
                ? "linear-gradient(135deg, #22d3a5, #6378ff)"
                : "linear-gradient(135deg, #6378ff, #a78bfa)",
              border: "2px solid rgba(255,255,255,0.2)",
              boxShadow: cp.done
                ? "0 0 12px rgba(34,211,165,0.6)"
                : "0 0 12px rgba(99,120,255,0.6)",
              color: "white",
            }}
          >
            {cp.done ? "✓" : "●"}
          </button>

          {/* Tooltip on hover */}
          <div className="absolute bottom-9 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
            <div className="rounded-lg px-3 py-1.5 text-xs whitespace-nowrap max-w-[180px] truncate"
              style={{ background: "rgba(14,20,32,0.95)", border: "1px solid rgba(99,120,255,0.3)", color: "var(--text)", backdropFilter: "blur(10px)" }}>
              {cp.label}
            </div>
            <div className="w-2 h-2 rotate-45 -mt-1"
              style={{ background: "rgba(14,20,32,0.95)", border: "0 0 1px 1px solid rgba(99,120,255,0.3)" }} />
          </div>

          {/* Delete on hover */}
          <button
            onClick={(e) => { e.stopPropagation(); deleteCheckpoint(cp.id); }}
            className="absolute -top-2 -right-2 w-4 h-4 rounded-full hidden group-hover:flex items-center justify-center text-xs pointer-events-auto"
            style={{ background: "#ef4444", color: "white", fontSize: "9px" }}
          >
            ×
          </button>
        </div>
      ))}

      {/* Pending checkpoint dialog */}
      {pendingPos && (
        <div
          className="absolute z-30"
          style={{ left: `${pendingPos.x}%`, top: `${pendingPos.y}%`, transform: "translate(-50%, -110%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-xl p-3 flex flex-col gap-2 min-w-[200px]"
            style={{ background: "rgba(14,20,32,0.97)", border: "1px solid rgba(99,120,255,0.3)", backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--accent2)" }}>Add checkpoint</p>
            <input
              autoFocus
              className="rounded-lg px-3 py-2 text-sm outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(99,120,255,0.25)",
                color: "var(--text)",
              }}
              placeholder="Label (optional)"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmCheckpoint();
                if (e.key === "Escape") setPendingPos(null);
              }}
            />
            <div className="flex gap-2">
              <button onClick={confirmCheckpoint}
                className="btn-primary flex-1 rounded-lg py-1.5 text-xs">
                Add
              </button>
              <button onClick={() => setPendingPos(null)}
                className="flex-1 rounded-lg py-1.5 text-xs transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--muted)" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
