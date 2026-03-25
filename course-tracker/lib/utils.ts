export function getSubjectColor(subject: string): [string, string] {
  const SUBJECT_COLORS: Record<string, [string, string]> = {
    "Engineering Mathematics": ["#6378ff", "#a78bfa"],
    "Discrete Mathematics":    ["#22d3a5", "#6378ff"],
    "Fundamentals (Aptitude)": ["#f59e0b", "#ef4444"],
    "Linear Algebra":          ["#6378ff", "#a78bfa"],
  };

  return SUBJECT_COLORS[subject] || ["#6b7280", "#374151"];
}
