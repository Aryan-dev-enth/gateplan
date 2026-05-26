import { connectDB } from "@/lib/mongodb";
import { JobNotificationModel } from "@/lib/models";
import JobsClient from "./JobsClient";

// Force dynamic routing so data is fresh on visit
export const dynamic = "force-dynamic";

export default async function JobsPage() {
  await connectDB();
  
  // Sort so CS/IT specific jobs are shown first, then ordered by newest scraped date
  const jobs = await JobNotificationModel.find({})
    .sort({ isCsItSpecific: -1, scrapedAt: -1 })
    .lean();
    
  // Serialize dates and _ids for clean client passing
  const serializedJobs = JSON.parse(JSON.stringify(jobs));
  
  const mostRecentScrape = jobs.length > 0 
    ? new Date(Math.max(...jobs.map(j => new Date(j.scrapedAt).getTime()))).toISOString()
    : null;
    
  return (
    <JobsClient 
      initialJobs={serializedJobs} 
      initialLastUpdated={mostRecentScrape} 
    />
  );
}
