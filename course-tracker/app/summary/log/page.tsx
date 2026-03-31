"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, Moon } from "lucide-react";
import { getCurrentUser, saveDailySummary, getUser, DailySummary } from "@/lib/store";
import DailySummaryForm from "@/components/DailySummaryForm";

function LogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") as "quick" | "eod" | "full") || "eod";
  
  const [username, setUsername] = useState("");
  const [history, setHistory] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      router.replace("/");
      return;
    }
    setUsername(u);
    
    // Fetch existing history to support updates
    getUser(u).then(data => {
      setHistory(data.dailySummaries || []);
      setLoading(false);
    });
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const isQuick = mode === "quick";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 glass rounded-xl hover:bg-white/10 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            {isQuick ? <Zap className="text-yellow-400" /> : <Moon className="text-blue-400" />}
            <h1 className="text-3xl font-bold grad-text">
              {isQuick ? "Quick Performance Log" : "End of Day Summary"}
            </h1>
          </div>
        </div>

        <div className="glass p-8 rounded-3xl border border-white/5">
          <DailySummaryForm 
            username={username}
            isPage={true}
            mode={mode}
            initialSummaries={history}
            onSave={async (summary) => {
              console.log("LogPage: Saving summary", summary);
              try {
                const res = await saveDailySummary(username, summary);
                if (res.error) {
                  alert("Server Error: " + (res.details || res.error));
                } else {
                  router.push("/summary");
                }
              } catch (err) {
                console.error("LogPage: Save failed", err);
                alert("Failed to save summary: " + (err instanceof Error ? err.message : String(err)));
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LogContent />
    </Suspense>
  );
}
