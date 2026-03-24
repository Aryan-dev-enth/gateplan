"use client";

interface ScheduleItem {
  month: string;
  deepakSubject: string;
  sachinSubject: string;
}

const scheduleData: ScheduleItem[] = [
  { month: "March", deepakSubject: "Discrete Mathematics (DM)", sachinSubject: "Linear Algebra (LA)" },
  { month: "April", deepakSubject: "Discrete Mathematics (DM)", sachinSubject: "Probability (Prob)" },
  { month: "May", deepakSubject: "Digital Logic (DL)", sachinSubject: "Calculus" },
  { month: "June", deepakSubject: "Computer Organization and Architecture (COA)", sachinSubject: "C Programming, Computer Networks (CN)" },
  { month: "July", deepakSubject: "Database Management Systems (DBMS)", sachinSubject: "Operating Systems (OS)" },
  { month: "August", deepakSubject: "Theory of Computation (TOC)", sachinSubject: "Data Structures" },
  { month: "September", deepakSubject: "Compiler Design", sachinSubject: "Algorithms" },
];

export default function GOClassesSchedule() {
  return (
    <div className="glass p-6 fade-in">
      <h2 className="text-lg font-bold mb-4 grad-text">GO Classes Schedule</h2>
      
      <div className="mb-4">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: "linear-gradient(135deg, #6378ff, #a78bfa)" }}></div>
            <span style={{ color: "var(--muted)" }}>Deepak CSE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: "linear-gradient(135deg, #22d3a5, #06b6d4)" }}></div>
            <span style={{ color: "var(--muted)" }}>Sachin CSE</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {scheduleData.map((item, index) => (
          <div key={item.month} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "var(--tint-accent)", border: "1px solid var(--border)" }}>
            <div className="flex-shrink-0 w-16 text-sm font-semibold" style={{ color: "var(--accent2)" }}>
              {item.month}
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: "linear-gradient(135deg, #6378ff, #a78bfa)" }}></div>
                <span style={{ color: "var(--text)" }}>{item.deepakSubject}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: "linear-gradient(135deg, #22d3a5, #06b6d4)" }}></div>
                <span style={{ color: "var(--text)" }}>{item.sachinSubject}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          📅 Schedule covers GATE CSE 2026 preparation from March to September
        </p>
      </div>
    </div>
  );
}
