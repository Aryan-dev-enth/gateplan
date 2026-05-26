import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { JobNotificationModel } from "@/lib/models";
import { runJobScrape } from "@/lib/jobScraper";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Sort so CS/IT specific jobs appear first, followed by others, ordered by newest scraped date
    let jobs = await JobNotificationModel.find({})
      .sort({ isCsItSpecific: -1, scrapedAt: -1 })
      .lean();
    
    let shouldScrapeSync = false;
    
    if (jobs.length === 0) {
      shouldScrapeSync = true;
    } else {
      // Find the most recently scraped document's timestamp
      const mostRecentScrape = Math.max(...jobs.map(j => new Date(j.scrapedAt).getTime()));
      const ageMs = Date.now() - mostRecentScrape;
      
      // If the latest scrape is older than 1 hour (3600000ms), trigger background update
      if (ageMs > 1000 * 60 * 60) {
        console.log(`[API/Jobs] Jobs cache is stale (${(ageMs / 1000 / 60).toFixed(1)} mins old). Triggering background lazy update...`);
        
        // Lazy background update (do not await, let it run asynchronously)
        runJobScrape().catch(err => {
          console.error("[API/Jobs] Error in background lazy scrape:", err);
        });
      }
    }
    
    if (shouldScrapeSync) {
      console.log("[API/Jobs] Cache is empty. Performing synchronous live scrape...");
      await runJobScrape();
      
      // Fetch again after scrape
      jobs = await JobNotificationModel.find({})
        .sort({ isCsItSpecific: -1, scrapedAt: -1 })
        .lean();
    }
    
    const mostRecentScrapeDate = jobs.length > 0 
      ? new Date(Math.max(...jobs.map(j => new Date(j.scrapedAt).getTime())))
      : null;
      
    return NextResponse.json({
      success: true,
      jobs,
      lastUpdated: mostRecentScrapeDate,
      count: jobs.length
    });
  } catch (error: any) {
    console.error("[API/Jobs] GET handler error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("[API/Jobs] Force refresh triggered via POST...");
    await connectDB();
    
    // Check for optional purge parameter in body
    const body = await req.json().catch(() => ({}));
    const purge = !!body.purge;
    
    if (purge) {
      console.log("[API/Jobs] Purging all job notifications from database as requested...");
      await JobNotificationModel.deleteMany({});
    }
    
    // Run live scrape (force updates if necessary)
    const upsertedCount = await runJobScrape(true);
    
    const jobs = await JobNotificationModel.find({})
      .sort({ isCsItSpecific: -1, scrapedAt: -1 })
      .lean();
      
    const mostRecentScrapeDate = jobs.length > 0 
      ? new Date(Math.max(...jobs.map(j => new Date(j.scrapedAt).getTime())))
      : new Date();
      
    return NextResponse.json({
      success: true,
      message: `Scrape finished. Upserted/updated ${upsertedCount} jobs.`,
      upsertedCount,
      jobs,
      lastUpdated: mostRecentScrapeDate,
      count: jobs.length
    });
  } catch (error: any) {
    console.error("[API/Jobs] POST handler error:", error);
    return NextResponse.json({ error: error.message || "Scrape execution failed" }, { status: 500 });
  }
}
