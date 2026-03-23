export default function ProgressBar({
  value,
  total,
  size = "md",
  formatValue,
}: {
  value: number;
  total: number;
  size?: "sm" | "md";
  formatValue?: (v: number) => string;
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const h = size === "sm" ? "h-1" : "h-1.5";
  const fmt = formatValue ?? ((v: number) => Number.isInteger(v) ? String(v) : v.toFixed(1));

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--muted)" }}>
        <span>{fmt(value)}/{fmt(total)}</span>
        <span style={{ color: pct === 100 ? "var(--green)" : "var(--accent2)" }}>{pct}%</span>
      </div>
      <div className={`w-full rounded-full ${h}`} style={{ background: "rgba(99,120,255,0.1)" }}>
        <div
          className={`${h} rounded-full transition-all duration-500`}
          style={{
            width: `${pct}%`,
            background:
              pct === 100
                ? "linear-gradient(90deg, #22d3a5, #6378ff)"
                : "linear-gradient(90deg, #6378ff, #a78bfa)",
            boxShadow: pct > 0 ? "0 0 8px rgba(99,120,255,0.5)" : "none",
          }}
        />
      </div>
    </div>
  );
}

/** Circular progress ring for dashboard hero */
export function ProgressRing({
  value,
  total,
  radius = 54,
}: {
  value: number;
  total: number;
  radius?: number;
}) {
  const pct = total === 0 ? 0 : value / total;
  const stroke = 6;
  const norm = radius - stroke / 2;
  const circ = 2 * Math.PI * norm;
  const dash = circ * pct;

  const gradId = `ring-grad-${radius}`;

  return (
    <svg
      width={radius * 2}
      height={radius * 2}
      viewBox={`0 0 ${radius * 2} ${radius * 2}`}
      fill="none"
      style={{ transform: "rotate(-90deg)", display: "block" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6378ff" />
          <stop offset="100%" stopColor="#22d3a5" />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle
        cx={radius}
        cy={radius}
        r={norm}
        fill="none"
        stroke="rgba(99,120,255,0.1)"
        strokeWidth={stroke}
      />
      {/* Progress */}
      <circle
        cx={radius}
        cy={radius}
        r={norm}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}
