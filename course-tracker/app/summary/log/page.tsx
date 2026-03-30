"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser, saveDailySummary, getUser, DailySummary } from "@/lib/store";
import DailySummaryForm from "@/components/DailySummaryForm";

export default function LogEodPage() {
  const router = useRouter();
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

  if (loading) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 glass rounded-xl hover:bg-white/10 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold grad-text">Log End of Day</h1>
        </div>

        <div className="glass p-8 rounded-3xl">
          <DailySummaryForm 
            username={username}
            isPage={true}
            initialSummaries={history}
            onSave={async (summary) => {
              console.log("LogEodPage: Saving summary", summary);
              try {
                const res = await saveDailySummary(username, summary);
                console.log("LogEodPage: Save result", res);
                if (res.error) {
                  alert("Server Error: " + (res.details || res.error));
                } else {
                  router.push("/summary");
                }
              } catch (err) {
                console.error("LogEodPage: Save failed", err);
                alert("Failed to save summary: " + (err instanceof Error ? err.message : String(err)));
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
