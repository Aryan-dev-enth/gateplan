"use client";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/Toast";

interface Job {
  _id: string;
  title: string;
  url: string;
  lastDate: string;
  payScale: string;
  vacancies: string;
  eligibility: string;
  overview: string;
  applicationLink: string;
  isCsItSpecific: boolean;
  isGeneralOfficer: boolean;
  scrapedAt: string;
  source: string;
}

const MAHARATNA_LIST = [
  { name: "Oil and Natural Gas Corporation", abbr: "ONGC" },
  { name: "Gas Authority of India Limited", abbr: "GAIL" },
  { name: "Bharat Heavy Electricals Limited", abbr: "BHEL" },
  { name: "Indian Oil Corporation Limited", abbr: "IOCL" },
  { name: "Steel Authority of India Limited", abbr: "SAIL" },
  { name: "Coal India Limited", abbr: "CIL" },
  { name: "National Thermal Power Corporation", abbr: "NTPC" },
  { name: "Bharat Petroleum Corporation Limited", abbr: "BPCL" }
];

const NAVRATNA_LIST = [
  { name: "Hindustan Petroleum Corporation Limited", abbr: "HPCL" },
  { name: "Bharat Electronics Limited", abbr: "BEL" },
  { name: "Neyveli Lignite Corporation Limited", abbr: "NLC" },
  { name: "Container Corporation of India", abbr: "CONCOR" },
  { name: "Mahanagar Telephone Nigam Limited", abbr: "MTNL" },
  { name: "Engineers India Limited", abbr: "EIL" },
  { name: "Hindustan Aeronautics Limited", abbr: "HAL" },
  { name: "Power Grid Corporation of India Limited", abbr: "PGCIL" },
  { name: "Power Finance Corporation", abbr: "PFC" },
  { name: "National Aluminium Company", abbr: "NALCO" },
  { name: "National Buildings Construction Corporation", abbr: "NBCC" },
  { name: "National Mineral Development Corporation", abbr: "NMDC" },
  { name: "Oil India Limited", abbr: "OIL" },
  { name: "Shipping Corporation of India", abbr: "SCI" },
  { name: "Rashtriya Ispat Nigam Limited", abbr: "RINL" },
  { name: "Rural Electrification Corporation", abbr: "REC" }
];

function getDeadlineTimestamp(dateStr: string): number {
  if (!dateStr || /soon|norms|specified/i.test(dateStr)) {
    return Infinity; // Put "Apply Soon" far in the future
  }
  
  let cleaned = dateStr.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
  cleaned = cleaned.replace(/\s+/g, " ");

  // Try parsing dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
  const numericMatch = cleaned.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1]);
    const month = parseInt(numericMatch[2]) - 1;
    const year = parseInt(numericMatch[3]);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  
  const parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) {
    return parsed;
  }
  
  return Infinity;
}

function doesJobMatchPsu(job: Job, psuAbbr: string, psuName: string): boolean {
  const lowerTitle = job.title.toLowerCase();
  const lowerAbbr = psuAbbr.toLowerCase();
  const lowerName = psuName.toLowerCase();
  
  const cleanTitle = lowerTitle.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ");
  
  // Case 1: Match whole word abbreviation e.g. "CIL", "BEL", "BHEL"
  const abbrRegex = new RegExp(`\\b${lowerAbbr}\\b`, 'i');
  if (abbrRegex.test(cleanTitle)) return true;
  
  // Case 2: Match parts of the full name
  if (cleanTitle.includes(lowerName)) return true;
  
  // Case 3: Handle specific common name variations
  if (lowerAbbr === "cil" && cleanTitle.includes("coal india")) return true;
  if (lowerAbbr === "bel" && cleanTitle.includes("bharat electronics")) return true;
  if (lowerAbbr === "bhel" && cleanTitle.includes("bharat heavy")) return true;
  if (lowerAbbr === "pgcil" && cleanTitle.includes("power grid")) return true;
  
  return false;
}

interface JobsClientProps {
  initialJobs: Job[];
  initialLastUpdated: string | null;
}

export default function JobsClient({ initialJobs, initialLastUpdated }: JobsClientProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [lastUpdated, setLastUpdated] = useState<string | null>(initialLastUpdated);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "specialist" | "general">("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [psuTab, setPsuTab] = useState<"maharatna" | "navratna">("maharatna");
  const { addToast } = useToast();

  function handlePsuClick(abbr: string) {
    if (searchQuery.toLowerCase() === abbr.toLowerCase()) {
      setSearchQuery("");
    } else {
      setSearchQuery(abbr);
    }
  }

  const isPsuFilterActive = useMemo(() => {
    return [...MAHARATNA_LIST, ...NAVRATNA_LIST].some(
      p => searchQuery.toLowerCase() === p.abbr.toLowerCase()
    );
  }, [searchQuery]);

  // Helper to format dates relatively or cleanly
  function formatLastUpdated(dateStr: string | null) {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 1000 / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins === 1) return "1 minute ago";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Live Relative Time tick for the synced badge
  const [relativeTime, setRelativeTime] = useState("");
  useEffect(() => {
    setRelativeTime(formatLastUpdated(lastUpdated));
    const timer = setInterval(() => {
      setRelativeTime(formatLastUpdated(lastUpdated));
    }, 30000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Handle Manual Force Refresh Scrape
  async function handleForceRefresh(purge = false) {
    if (isSyncing) return;
    
    if (purge && !confirm("Are you sure you want to delete all stored jobs from the database and perform a fresh scrape?")) {
      return;
    }
    
    setIsSyncing(true);
    addToast({
      message: purge 
        ? "Purging Cache: Deleting all stored records and scraping fresh..."
        : "Scrape Triggered: Scraping Bankersadda, IndGovtJobs, and Sarkari Result...",
      type: "info",
    });

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ purge })
      });

      if (!res.ok) {
        throw new Error(`Server returned code ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs);
        setLastUpdated(data.lastUpdated);
        addToast({
          message: purge 
            ? "Cache Purged: Successfully cleared database and synced B.Tech CSE jobs."
            : `Scrape Completed: Successfully updated ${data.upsertedCount} job records.`,
          type: "success",
        });
      } else {
        throw new Error(data.error || "Scrape failed");
      }
    } catch (err: any) {
      console.error(err);
      addToast({
        message: `Sync Failed: ${err.message || "Failed to reach scraping service."}`,
        type: "error",
      });
    } finally {
      setIsSyncing(false);
    }
  }

  // Dynamic Real-time job counts for each PSU (excluding expired jobs)
  const psuJobCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const todayStart = new Date().setHours(0, 0, 0, 0);

    const activeUnexpiredJobs = jobs.filter(job => {
      const t = getDeadlineTimestamp(job.lastDate);
      return t === Infinity || t >= todayStart;
    });

    for (const psu of [...MAHARATNA_LIST, ...NAVRATNA_LIST]) {
      counts[psu.abbr] = activeUnexpiredJobs.filter(job => 
        doesJobMatchPsu(job, psu.abbr, psu.name)
      ).length;
    }
    return counts;
  }, [jobs]);

  // Filter and search logic
  const filteredJobs = jobs.filter((job) => {
    // 0. Exclude expired deadlines
    const t = getDeadlineTimestamp(job.lastDate);
    const todayStart = new Date().setHours(0, 0, 0, 0);
    if (t !== Infinity && t < todayStart) {
      return false;
    }

    // 1. Tab Filter
    if (activeTab === "specialist" && !job.isCsItSpecific) return false;
    if (activeTab === "general" && !job.isGeneralOfficer) return false;

    // 2. Search query filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();

      // Check if query matches a PSU abbreviation
      const matchedPsu = [...MAHARATNA_LIST, ...NAVRATNA_LIST].find(
        p => p.abbr.toLowerCase() === query
      );

      if (matchedPsu) {
        return doesJobMatchPsu(job, matchedPsu.abbr, matchedPsu.name);
      }

      const matchTitle = job.title.toLowerCase().includes(query);
      const matchElig = job.eligibility.toLowerCase().includes(query);
      const matchOverview = job.overview.toLowerCase().includes(query);
      const matchPay = job.payScale.toLowerCase().includes(query);
      return matchTitle || matchElig || matchOverview || matchPay;
    }

    return true;
  });

  // Parse and sort jobs from current date
  const sortedJobs = useMemo(() => {
    const todayStart = new Date().setHours(0, 0, 0, 0); // start of today
    
    return [...filteredJobs].sort((a, b) => {
      const tA = getDeadlineTimestamp(a.lastDate);
      const tB = getDeadlineTimestamp(b.lastDate);
      
      const isExpiredA = tA !== Infinity && tA < todayStart;
      const isExpiredB = tB !== Infinity && tB < todayStart;
      
      // 1. If one is expired and the other is not, put expired at the bottom
      if (isExpiredA && !isExpiredB) return 1;
      if (!isExpiredA && isExpiredB) return -1;
      
      // 2. If both are expired, sort descending (most recently expired first)
      if (isExpiredA && isExpiredB) {
        return tB - tA; 
      }
      
      // 3. Both are active/upcoming or "Apply Soon"
      // If one is "Apply Soon" (Infinity) and the other has a specific date, put the specific date first!
      if (tA === Infinity && tB !== Infinity) return 1;
      if (tA !== Infinity && tB === Infinity) return -1;
      
      // 4. Both have valid upcoming dates, sort ascending (closest deadline first!)
      return tA - tB;
    });
  }, [filteredJobs]);

  // Extract organization tag (e.g. "SBI", "DRDO", "RBI", "PNB", "UIIC")
  function getOrgTag(title: string) {
    const uppercase = title.toUpperCase();
    const commonOrgs = ["SBI", "DRDO", "RBI", "PNB", "UIIC", "IOCL", "ISRO", "BARC", "NIACL", "NICL", "LIC", "IBPS"];
    for (const org of commonOrgs) {
      if (uppercase.includes(org)) return org;
    }
    // Fallback first two words
    const words = title.split(" ").slice(0, 2).join(" ");
    return words.replace(/Recruitment|Notification|jobs/gi, "").trim();
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Decorative Glow Orbs */}
      <div className="glow-orb w-[500px] h-[500px] -top-40 -left-40 opacity-20 pointer-events-none" style={{ background: "rgba(51, 154, 240, 0.15)", display: "block" }} />
      <div className="glow-orb w-[400px] h-[400px] -bottom-20 -right-20 opacity-10 pointer-events-none" style={{ background: "rgba(116, 192, 252, 0.1)", display: "block" }} />

      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10 fade-in">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b pb-6" style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" 
                style={{ background: "var(--tint-accent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                ✦ B.Tech CSE Command Center
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" 
                style={{ background: "var(--tint-green)", color: "var(--green)", border: "1px solid var(--tint-green-border)" }}>
                Live Scraper Active
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight grad-text mb-1">
              Govt Jobs Notification Hub
            </h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Strictly tracking B.Tech CSE / IT specialist recruitments, target PSUs, and eligible officer postings.
            </p>
          </div>

          {/* Scrape status controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/5 p-4 rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: "var(--text)" }}>Database Status</p>
              <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--text)" }}>
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Last checked: <span className="text-blue-400 font-bold">{relativeTime}</span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => handleForceRefresh(false)}
                disabled={isSyncing}
                className={`btn-primary flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all shadow-md ${
                  isSyncing ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {isSyncing ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <span>🔄</span> Force Live Scrape
                  </>
                )}
              </button>

              <button
                onClick={() => handleForceRefresh(true)}
                disabled={isSyncing}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all border transition-all ${
                  isSyncing 
                    ? "opacity-60 cursor-not-allowed" 
                    : "bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-500/40"
                }`}
              >
                <span>🗑️</span> Purge & Rescrape
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Area: Search, Tabs, Table */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search & Filter Tabs row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Tabs */}
              <div className="flex p-0.5 rounded-lg border flex-shrink-0" style={{ background: "var(--surface2)", borderColor: "var(--border)", maxWidth: "fit-content" }}>
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === "all"
                      ? "bg-white/10 text-white shadow-sm border border-white/5"
                      : "text-muted hover:text-white"
                  }`}
                  style={{ color: activeTab === "all" ? "var(--text)" : "var(--muted)" }}
                >
                  All Open ({jobs.length})
                </button>
                <button
                  onClick={() => setActiveTab("specialist")}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeTab === "specialist"
                      ? "bg-white/10 text-white shadow-sm border border-white/5"
                      : "text-muted hover:text-white"
                  }`}
                  style={{ color: activeTab === "specialist" ? "var(--accent2)" : "var(--muted)" }}
                >
                  <span>✦</span> CS/IT Specialist ({jobs.filter(j => j.isCsItSpecific).length})
                </button>
                <button
                  onClick={() => setActiveTab("general")}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === "general"
                      ? "bg-white/10 text-white shadow-sm border border-white/5"
                      : "text-muted hover:text-white"
                  }`}
                  style={{ color: activeTab === "general" ? "var(--green)" : "var(--muted)" }}
                >
                  General Officer ({jobs.filter(j => j.isGeneralOfficer).length})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full md:max-w-md">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-50">🔍</span>
                <input
                  type="text"
                  placeholder="Search jobs, pay scale, or qualification (e.g. B.Tech, MCA)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-glow w-full rounded-lg px-9 py-2 text-xs transition-all"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] hover:text-white" 
                    style={{ color: "var(--muted)" }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Jobs Table Layout */}
            {sortedJobs.length === 0 ? (
              <div className="glass p-12 text-center flex flex-col items-center justify-center fade-in border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <span className="text-4xl mb-3">📁</span>
                <h3 className="text-base font-bold mb-1">No matching opportunities found</h3>
                <p className="text-xs mb-4 max-w-sm" style={{ color: "var(--muted)" }}>
                  {searchQuery ? "Try refining your search terms or expanding your filter selection." : "Click 'Force Live Scrape' to check live data."}
                </p>
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(""); setActiveTab("all"); }} 
                    className="text-xs font-bold underline" 
                    style={{ color: "var(--accent)" }}
                  >
                    Reset Search Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="glass-premium rounded-xl overflow-hidden border fade-in" style={{ borderColor: "var(--border)" }}>
                <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr style={{ background: "var(--surface2)", borderBottom: "2px solid var(--border)" }}>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-muted" style={{ color: "var(--muted)", fontSize: "10px" }}>Opportunity / Title</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-muted text-center" style={{ color: "var(--muted)", fontSize: "10px" }}>Category</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-muted text-center" style={{ color: "var(--muted)", fontSize: "10px" }}>Vacancies</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-muted" style={{ color: "var(--muted)", fontSize: "10px" }}>Pay Scale</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-muted" style={{ color: "var(--muted)", fontSize: "10px" }}>Academic Eligibility</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-muted text-center" style={{ color: "var(--muted)", fontSize: "10px" }}>Deadline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedJobs.map((job, idx) => {
                        const org = getOrgTag(job.title);
                        
                        return (
                          <tr
                            key={job._id}
                            onClick={() => setSelectedJob(job)}
                            className="border-b transition-colors cursor-pointer hover:bg-white/5"
                            style={{
                              borderColor: "var(--border)",
                              background: idx % 2 === 1 ? "rgba(255,255,255,0.01)" : "transparent"
                            }}
                          >
                            {/* Title */}
                            <td className="py-2 px-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-xs leading-snug hover:text-blue-400 transition-colors" style={{ color: "var(--text)" }}>
                                  {job.title}
                                </span>
                                {job.source && (
                                  <span className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--muted)" }}>
                                    {job.source}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Category */}
                            <td className="py-2 px-3 text-center">
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded inline-block"
                                style={{
                                  background: job.isCsItSpecific 
                                    ? "var(--tint-accent)" 
                                    : job.isGeneralOfficer 
                                    ? "var(--tint-green)" 
                                    : "var(--surface2)",
                                  color: job.isCsItSpecific 
                                    ? "var(--accent2)" 
                                    : job.isGeneralOfficer 
                                    ? "var(--green)" 
                                    : "var(--muted)",
                                  border: `1px solid ${
                                    job.isCsItSpecific 
                                      ? "rgba(116,192,252,0.2)" 
                                      : job.isGeneralOfficer 
                                      ? "var(--tint-green-border)" 
                                      : "transparent"
                                  }`
                                }}
                              >
                                {job.isCsItSpecific ? "✦ CS/IT Spec" : job.isGeneralOfficer ? "B.Tech Officer" : "Other"}
                              </span>
                            </td>
                            
                            {/* Vacancies */}
                            <td className="py-2 px-3 text-center font-bold text-xs" style={{ color: "var(--text)" }}>
                              {job.vacancies}
                            </td>
                            
                            {/* Pay Scale */}
                            <td className="py-2 px-3 font-semibold text-[11px] max-w-[200px] truncate" style={{ color: "var(--text)" }} title={job.payScale}>
                              {job.payScale}
                            </td>
                            
                            {/* Eligibility */}
                            <td className="py-2 px-3 text-blue-400 font-semibold text-[11px] max-w-[220px] truncate" title={job.eligibility}>
                              {job.eligibility}
                            </td>
                            
                            {/* Last Date */}
                            <td className="py-2 px-3 text-center font-bold text-xs" style={{ color: "var(--red)" }}>
                              {job.lastDate}
                            </td>
                            

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Target PSU Directory */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-premium rounded-xl p-5 border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" 
                  style={{ background: "var(--tint-accent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                  ✦ PSU Directory
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                Elite Target PSUs
              </h3>
              <p className="text-[11px] mb-4" style={{ color: "var(--muted)" }}>
                Click any PSU below to instantly filter for active vacancies.
              </p>

              {/* Reset Active Filter */}
              {isPsuFilterActive && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="w-full text-center text-xs font-bold py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 transition-all mb-4 flex items-center justify-center gap-1.5"
                >
                  ✕ Clear PSU Filter
                </button>
              )}

              {/* Sidebar Tabs */}
              <div className="flex p-0.5 rounded-lg border mb-4" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                <button
                  onClick={() => setPsuTab("maharatna")}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all text-center ${
                    psuTab === "maharatna"
                      ? "bg-white/10 text-white shadow-sm border border-white/5"
                      : "text-muted hover:text-white"
                  }`}
                  style={{ color: psuTab === "maharatna" ? "var(--text)" : "var(--muted)" }}
                >
                  Maharatna ({MAHARATNA_LIST.length})
                </button>
                <button
                  onClick={() => setPsuTab("navratna")}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all text-center ${
                    psuTab === "navratna"
                      ? "bg-white/10 text-white shadow-sm border border-white/5"
                      : "text-muted hover:text-white"
                  }`}
                  style={{ color: psuTab === "navratna" ? "var(--text)" : "var(--muted)" }}
                >
                  Navratnas ({NAVRATNA_LIST.length})
                </button>
              </div>

              {/* PSU Scrollable List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                {(psuTab === "maharatna" ? MAHARATNA_LIST : NAVRATNA_LIST).map((psu) => {
                  const isActive = searchQuery.toLowerCase() === psu.abbr.toLowerCase();
                  const count = psuJobCounts[psu.abbr] || 0;

                  return (
                    <button
                      key={psu.abbr}
                      onClick={() => handlePsuClick(psu.abbr)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all hover:scale-[1.01]"
                      style={{
                        background: isActive ? "var(--tint-accent)" : "rgba(255, 255, 255, 0.01)",
                        borderColor: isActive ? "var(--accent)" : "var(--border)",
                        boxShadow: isActive ? "0 0 10px rgba(51, 154, 240, 0.15)" : "none"
                      }}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                        <span className="font-bold text-xs" style={{ color: isActive ? "var(--accent2)" : "var(--text)" }}>
                          {psu.abbr}
                        </span>
                        <span className="text-[10px] truncate" style={{ color: "var(--muted)" }} title={psu.name}>
                          {psu.name}
                        </span>
                      </div>
                      
                      {count > 0 && (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 text-[9px] font-extrabold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full border border-green-500/20">
                          <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse"></span>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Scrape Guide Quick Info Card */}
            <div className="glass-premium rounded-xl p-5 border text-xs" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.02)" }}>
              <h4 className="font-bold mb-2 flex items-center gap-1.5 text-white">
                <span>⚡</span> Scraper Guide
              </h4>
              <ul className="space-y-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
                <li className="flex gap-1.5">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Strictly B.Tech CSE / IT eligible roles</span>
                </li>
                <li className="flex gap-1.5">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Self-cleansing expired deadline filter</span>
                </li>
                <li className="flex gap-1.5">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>100% manual application link scraping</span>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Slide-out Drawer Panel (Detail View) */}
        {selectedJob && (
          <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setSelectedJob(null)}>
            
            {/* Drawer container */}
            <div 
              className="w-full max-w-lg h-full flex flex-col justify-between shadow-2xl relative border-l"
              style={{ background: "var(--glass-bg)", borderColor: "var(--border)" }}
              onClick={(e) => e.stopPropagation()} // prevent close on inner click
            >
              
              {/* Drawer Top / Header */}
              <div className="p-6 border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded"
                    style={{
                      background: selectedJob.isCsItSpecific 
                        ? "var(--tint-accent)" 
                        : selectedJob.isGeneralOfficer 
                        ? "var(--tint-green)" 
                        : "var(--surface2)",
                      color: selectedJob.isCsItSpecific 
                        ? "var(--accent2)" 
                        : selectedJob.isGeneralOfficer 
                        ? "var(--green)" 
                        : "var(--muted)",
                      border: `1px solid ${
                        selectedJob.isCsItSpecific 
                          ? "rgba(116,192,252,0.3)" 
                          : selectedJob.isGeneralOfficer 
                          ? "var(--tint-green-border)" 
                          : "transparent"
                      }`
                    }}
                  >
                    {selectedJob.isCsItSpecific ? "✦ Specialist CS/IT Job" : selectedJob.isGeneralOfficer ? "General Officer Post" : "Job notification"}
                  </span>
                  <button 
                    onClick={() => setSelectedJob(null)}
                    className="text-lg hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-all"
                    style={{ color: "var(--muted)" }}
                  >
                    ✕
                  </button>
                </div>

                <h2 className="text-lg font-bold leading-snug" style={{ color: "var(--text)" }}>
                  {selectedJob.title}
                </h2>
                <p className="text-[11px] mt-1.5" style={{ color: "var(--muted)" }}>
                  Source: <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-bold hover:underline inline-flex items-center gap-0.5">{selectedJob.source} ↗</a> · Scraped at: {new Date(selectedJob.scrapedAt).toLocaleDateString()}
                </p>
              </div>

              {/* Drawer Content */}
              <div className="p-6 flex-1 overflow-y-auto space-y-6" style={{ scrollbarWidth: "thin" }}>
                
                {/* Quick Highlights Factsheet */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="p-3 rounded-lg border bg-white/5 flex flex-col justify-between col-span-2" style={{ borderColor: "var(--border)" }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-60" style={{ color: "var(--muted)" }}>Recruitment Organiser</span>
                    <span className="text-xs font-bold text-white mt-1">{selectedJob.source}</span>
                  </div>
                  <div className="p-3 rounded-lg border bg-white/5 flex flex-col justify-between col-span-2" style={{ borderColor: "var(--border)" }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-60" style={{ color: "var(--muted)" }}>Pay Scale / Salary</span>
                    <span className="text-xs font-bold text-green-400 mt-1 leading-snug">{selectedJob.payScale}</span>
                  </div>
                  <div className="p-3 rounded-lg border bg-white/5 flex flex-col justify-between" style={{ borderColor: "var(--border)" }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-60" style={{ color: "var(--muted)" }}>Total Vacancies</span>
                    <span className="text-xs font-bold text-white mt-1">{selectedJob.vacancies}</span>
                  </div>
                  <div className="p-3 rounded-lg border bg-white/5 flex flex-col justify-between" style={{ borderColor: "var(--border)" }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-60" style={{ color: "var(--muted)" }}>Job Classification</span>
                    <span className="text-xs font-bold text-white mt-1">
                      {selectedJob.isCsItSpecific ? "✦ CS/IT Specialist" : "B.Tech General Officer"}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border bg-white/5 flex flex-col justify-between" style={{ borderColor: "var(--border)" }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-60" style={{ color: "var(--muted)" }}>Scrape Channel</span>
                    <span className="text-xs font-bold text-white mt-1">
                      {selectedJob.url.includes("indgovtjobs") ? "IndGovtJobs" : selectedJob.url.includes("bankersadda") ? "Bankersadda" : "Sarkari Result"}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border bg-white/5 flex flex-col justify-between" style={{ borderColor: "var(--border)" }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-60" style={{ color: "var(--muted)" }}>GATE CS/IT Alignment</span>
                    <span className="text-xs font-bold text-white mt-1">
                      {selectedJob.isCsItSpecific ? "Highly Aligned" : "General"}
                    </span>
                  </div>
                </div>

                {/* Overview block */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--accent2)" }}>
                    Overview & Description
                  </h4>
                  <div className="p-4 rounded-xl border leading-relaxed text-xs" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border)", color: "var(--text)" }}>
                    {selectedJob.overview}
                  </div>
                </div>

                {/* Eligibility requirements */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--accent2)" }}>
                    Academic / Professional Eligibility
                  </h4>
                  <div className="p-4 rounded-xl border space-y-3" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border)" }}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-green-500 font-bold">✓</span>
                      <div>
                        <p className="text-xs font-bold">Minimum Qualification</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{selectedJob.eligibility}</p>
                      </div>
                    </div>
                    {selectedJob.isCsItSpecific && (
                      <div className="flex items-start gap-2.5 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                        <span className="text-blue-400">✦</span>
                        <div>
                          <p className="text-xs font-bold text-blue-400">CS & IT Grad Highlight</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                            This post is categorized as a specialist role for Computer Science, IT, MCA, or relevant Engineering degrees. Highly matching GATE CS tracks.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline block */}
                <div className="rounded-xl p-4 border" style={{ background: "rgba(239,107,107,0.03)", borderColor: "rgba(239,107,107,0.2)" }}>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider mb-1" style={{ color: "var(--red)" }}>
                    Application Deadline
                  </h4>
                  <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                    {selectedJob.lastDate}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>
                    Please submit application details online before the closing date. Late submissions will not be accepted.
                  </p>
                </div>
              </div>

              {/* Drawer Bottom / Action Buttons */}
              <div className="p-6 border-t flex flex-col gap-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="flex items-center justify-between gap-3">
                  <a
                    href={selectedJob.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-lg px-3 py-2.5 text-xs font-bold border text-center transition-all hover:bg-white/5"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    🔍 View Source Article ↗
                  </a>
                  <a
                    href={selectedJob.applicationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 btn-primary rounded-lg px-3 py-2.5 text-xs font-bold text-center block shadow-md hover:scale-[1.01]"
                  >
                    🚀 Apply & Info Online ↗
                  </a>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="w-full rounded-lg py-2 text-[11px] font-bold text-muted hover:text-white transition-all text-center"
                >
                  Close Detail Panel
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
