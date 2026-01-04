import { createServerSupabase } from "./supabase";
import {
  fetchDailyMetrics,
  fetchKeywordRankings,
  fetchPagePerformance,
  fetchMetricsByCountry,
  fetchMetricsByDevice,
  getDateRange,
  getBackfillDateRange,
  type DateRange,
} from "./gsc";
import { generateInsights } from "./insights";
import type { PageType, AlertType, AlertSeverity } from "@/types/database";

const supabase = createServerSupabase();

// Type definitions for Supabase data
interface SyncLogRecord {
  id: string;
  started_at: string;
  status: string;
  records_synced: number;
}

interface KeywordRecord {
  date: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  page_url: string | null;
}

interface PageRecord {
  date: string;
  page_url: string;
  page_type: PageType;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface DailyMetricRecord {
  date: string;
}

// Determine page type from URL
function getPageType(url: string): PageType {
  if (url.includes("/blog/")) return "blog";
  if (url.includes("/tools/")) return "tool";
  if (
    url.includes("assignment-help") ||
    url.includes("homework") ||
    url.includes("essay")
  ) {
    return "service";
  }
  if (
    url === "https://domyhomework.co/" ||
    url.includes("/contact") ||
    url.includes("/about") ||
    url.includes("/faq") ||
    url.includes("/privacy") ||
    url.includes("/terms")
  ) {
    return "static";
  }
  return "other";
}

// Start a sync log entry
async function startSyncLog(): Promise<string> {
  const { data, error } = await supabase
    .from("seo_sync_logs")
    .insert({ started_at: new Date().toISOString(), status: "running", records_synced: 0 } as never)
    .select("id")
    .single() as { data: SyncLogRecord | null; error: any };

  if (error) throw error;
  return data!.id;
}

// Complete a sync log entry
async function completeSyncLog(
  id: string,
  recordsSynced: number,
  status: "completed" | "failed" = "completed",
  errorMessage?: string
) {
  await supabase
    .from("seo_sync_logs")
    .update({
      completed_at: new Date().toISOString(),
      status,
      records_synced: recordsSynced,
      error_message: errorMessage || null,
    } as never)
    .eq("id", id);
}

// Sync daily metrics
async function syncDailyMetrics(dateRange: DateRange): Promise<number> {
  const metrics = await fetchDailyMetrics(dateRange);

  if (metrics.length === 0) return 0;

  const { error } = await supabase.from("seo_daily_metrics").upsert(
    metrics.map((m) => ({
      date: m.date,
      total_clicks: m.clicks,
      total_impressions: m.impressions,
      avg_ctr: m.ctr,
      avg_position: m.position,
    })) as never[],
    { onConflict: "date" }
  );

  if (error) throw error;
  return metrics.length;
}

// Sync keyword rankings (aggregated per day-query)
async function syncKeywordRankings(dateRange: DateRange): Promise<number> {
  const rankings = await fetchKeywordRankings(dateRange);

  if (rankings.length === 0) return 0;

  // Aggregate by date + query (multiple pages can rank for same query)
  const aggregated = new Map<
    string,
    {
      date: string;
      query: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
      pageUrl: string | null;
    }
  >();

  for (const r of rankings) {
    const key = `${r.date}|${r.query}`;
    const existing = aggregated.get(key);

    if (!existing || r.clicks > existing.clicks) {
      // Keep the page with most clicks for this query
      aggregated.set(key, r);
    } else if (existing) {
      // Sum clicks and impressions
      existing.clicks += r.clicks;
      existing.impressions += r.impressions;
    }
  }

  const data = Array.from(aggregated.values()).map((r) => ({
    date: r.date,
    query: r.query,
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
    page_url: r.pageUrl,
  }));

  // Batch insert in chunks to avoid payload limits
  const BATCH_SIZE = 1000;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("seo_keyword_rankings")
      .upsert(batch as never[], { onConflict: "date,query" });

    if (error) throw error;
  }

  return data.length;
}

// Sync page performance
async function syncPagePerformance(dateRange: DateRange): Promise<number> {
  const pages = await fetchPagePerformance(dateRange);

  if (pages.length === 0) return 0;

  const data = pages.map((p) => ({
    date: p.date,
    page_url: p.pageUrl,
    page_type: getPageType(p.pageUrl),
    clicks: p.clicks,
    impressions: p.impressions,
    ctr: p.ctr,
    position: p.position,
  }));

  // Batch insert
  const BATCH_SIZE = 1000;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("seo_page_performance")
      .upsert(batch as never[], { onConflict: "date,page_url" });

    if (error) throw error;
  }

  return data.length;
}

// Sync country metrics
export async function syncCountryMetrics(
  supabaseClient: any,
  startDate: string,
  endDate: string
): Promise<number> {
  const data = await fetchMetricsByCountry(startDate, endDate);
  
  if (data.length === 0) return 0;

  const { error } = await supabaseClient
    .from("seo_metrics_by_country")
    .upsert(
      data.map((row) => ({
        date: row.date,
        country: row.country,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      })) as never[],
      { onConflict: "date,country" }
    );

  if (error) throw error;
  return data.length;
}

// Sync device metrics
export async function syncDeviceMetrics(
  supabaseClient: any,
  startDate: string,
  endDate: string
): Promise<number> {
  const data = await fetchMetricsByDevice(startDate, endDate);
  
  if (data.length === 0) return 0;

  const { error } = await supabaseClient
    .from("seo_metrics_by_device")
    .upsert(
      data.map((row) => ({
        date: row.date,
        device: row.device,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      })) as never[],
      { onConflict: "date,device" }
    );

  if (error) throw error;
  return data.length;
}

// Generate alerts by comparing current data to 7 days ago
async function generateAlerts(): Promise<number> {
  const alerts: Array<{
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    data: Record<string, unknown>;
  }> = [];

  // Get latest date in our data
  const { data: latestData } = await supabase
    .from("seo_daily_metrics")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .single() as { data: DailyMetricRecord | null; error: any };

  if (!latestData) return 0;

  const latestDate = latestData.date;
  const previousDate = new Date(latestDate);
  previousDate.setDate(previousDate.getDate() - 7);
  const prevDateStr = previousDate.toISOString().split("T")[0];

  // Get current and previous keywords
  const { data: currentKeywords } = await supabase
    .from("seo_keyword_rankings")
    .select("*")
    .eq("date", latestDate)
    .gt("impressions", 100) as { data: KeywordRecord[] | null; error: any };

  const { data: previousKeywords } = await supabase
    .from("seo_keyword_rankings")
    .select("*")
    .eq("date", prevDateStr) as { data: KeywordRecord[] | null; error: any };

  if (currentKeywords && previousKeywords) {
    const prevMap = new Map((previousKeywords as KeywordRecord[]).map((k) => [k.query, k]));

    for (const current of (currentKeywords as KeywordRecord[])) {
      const prev = prevMap.get(current.query);

      if (!prev) {
        // New keyword ranking
        if (current.position <= 20 && current.impressions >= 50) {
          alerts.push({
            type: "new_keyword",
            severity: "info",
            message: `New ranking: "${current.query}" at position ${current.position.toFixed(1)}`,
            data: {
              query: current.query,
              position: current.position,
              clicks: current.clicks,
              impressions: current.impressions,
            },
          });
        }
      } else {
        const positionDiff = prev.position - current.position;

        if (positionDiff >= 5) {
          // Gained 5+ positions
          alerts.push({
            type: "position_gain",
            severity: "info",
            message: `"${current.query}" improved ${positionDiff.toFixed(1)} positions (${prev.position.toFixed(1)} → ${current.position.toFixed(1)})`,
            data: {
              query: current.query,
              previousPosition: prev.position,
              currentPosition: current.position,
              gain: positionDiff,
            },
          });
        } else if (positionDiff <= -5) {
          // Lost 5+ positions
          const severity: AlertSeverity =
            positionDiff <= -10 ? "critical" : positionDiff <= -7 ? "warning" : "info";
          alerts.push({
            type: "position_drop",
            severity,
            message: `"${current.query}" dropped ${Math.abs(positionDiff).toFixed(1)} positions (${prev.position.toFixed(1)} → ${current.position.toFixed(1)})`,
            data: {
              query: current.query,
              previousPosition: prev.position,
              currentPosition: current.position,
              loss: Math.abs(positionDiff),
            },
          });
        }
      }
    }

    // Check for lost keywords (were ranking, now gone)
    for (const prev of (previousKeywords as KeywordRecord[])) {
      const current = (currentKeywords as KeywordRecord[]).find((k) => k.query === prev.query);
      if (!current && prev.position <= 20 && prev.impressions >= 100) {
        alerts.push({
          type: "lost_keyword",
          severity: "warning",
          message: `Lost ranking for "${prev.query}" (was position ${prev.position.toFixed(1)})`,
          data: {
            query: prev.query,
            previousPosition: prev.position,
            previousClicks: prev.clicks,
          },
        });
      }
    }
  }

  // Check for traffic changes on pages
  const { data: currentPages } = await supabase
    .from("seo_page_performance")
    .select("*")
    .eq("date", latestDate) as { data: PageRecord[] | null; error: any };

  const { data: previousPages } = await supabase
    .from("seo_page_performance")
    .select("*")
    .eq("date", prevDateStr) as { data: PageRecord[] | null; error: any };

  if (currentPages && previousPages) {
    const prevPageMap = new Map((previousPages as PageRecord[]).map((p) => [p.page_url, p]));

    for (const current of (currentPages as PageRecord[])) {
      const prev = prevPageMap.get(current.page_url);

      if (prev && prev.clicks > 0) {
        const clickChange = (current.clicks - prev.clicks) / prev.clicks;

        if (clickChange >= 1.0 && current.clicks >= 10) {
          // Traffic doubled
          alerts.push({
            type: "traffic_spike",
            severity: "info",
            message: `Traffic spike on ${current.page_url}: ${prev.clicks} → ${current.clicks} clicks (+${(clickChange * 100).toFixed(0)}%)`,
            data: {
              pageUrl: current.page_url,
              previousClicks: prev.clicks,
              currentClicks: current.clicks,
              changePercent: clickChange * 100,
            },
          });
        } else if (clickChange <= -0.5 && prev.clicks >= 20) {
          // Lost 50%+ traffic
          alerts.push({
            type: "traffic_drop",
            severity: "warning",
            message: `Traffic drop on ${current.page_url}: ${prev.clicks} → ${current.clicks} clicks (${(clickChange * 100).toFixed(0)}%)`,
            data: {
              pageUrl: current.page_url,
              previousClicks: prev.clicks,
              currentClicks: current.clicks,
              changePercent: clickChange * 100,
            },
          });
        }
      }
    }
  }

  // Insert alerts (skip if no alerts)
  if (alerts.length === 0) return 0;

  const { error } = await supabase.from("seo_alerts").insert(alerts as never[]);
  if (error) throw error;

  return alerts.length;
}

// Main sync function - run daily
export async function runDailySync(): Promise<{
  success: boolean;
  recordsSynced: number;
  alertsGenerated: number;
  insightsGenerated: number;
  error?: string;
}> {
  const syncId = await startSyncLog();
  let totalRecords = 0;
  let alertsGenerated = 0;
  let insightsGenerated = 0;

  try {
    // Sync last 7 days (to catch any late data)
    const dateRange = getDateRange(7);

    console.log(`Syncing data from ${dateRange.startDate} to ${dateRange.endDate}`);

    // Sync all data types
    const dailyCount = await syncDailyMetrics(dateRange);
    console.log(`Synced ${dailyCount} daily metrics`);
    totalRecords += dailyCount;

    const keywordCount = await syncKeywordRankings(dateRange);
    console.log(`Synced ${keywordCount} keyword rankings`);
    totalRecords += keywordCount;

    const pageCount = await syncPagePerformance(dateRange);
    console.log(`Synced ${pageCount} page performance records`);
    totalRecords += pageCount;

    // Generate alerts
    alertsGenerated = await generateAlerts();
    console.log(`Generated ${alertsGenerated} alerts`);

    // Generate insights
    const insightResult = await generateInsights();
    insightsGenerated = insightResult.generated;
    console.log(`Generated ${insightsGenerated} insights (expired: ${insightResult.expired})`);

    await completeSyncLog(syncId, totalRecords, "completed");

    return { success: true, recordsSynced: totalRecords, alertsGenerated, insightsGenerated };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync failed:", errorMessage);
    await completeSyncLog(syncId, totalRecords, "failed", errorMessage);
    return { success: false, recordsSynced: totalRecords, alertsGenerated, insightsGenerated, error: errorMessage };
  }
}

// Backfill historical data (run once)
export async function runBackfill(): Promise<{
  success: boolean;
  recordsSynced: number;
  error?: string;
}> {
  const syncId = await startSyncLog();
  let totalRecords = 0;

  try {
    const dateRange = getBackfillDateRange();
    console.log(`Backfilling data from ${dateRange.startDate} to ${dateRange.endDate}`);

    // Sync in monthly chunks to avoid timeouts
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    let currentStart = new Date(startDate);

    while (currentStart < endDate) {
      const currentEnd = new Date(currentStart);
      currentEnd.setMonth(currentEnd.getMonth() + 1);
      if (currentEnd > endDate) currentEnd.setTime(endDate.getTime());

      const monthRange: DateRange = {
        startDate: currentStart.toISOString().split("T")[0],
        endDate: currentEnd.toISOString().split("T")[0],
      };

      console.log(`Processing ${monthRange.startDate} to ${monthRange.endDate}`);

      const dailyCount = await syncDailyMetrics(monthRange);
      const keywordCount = await syncKeywordRankings(monthRange);
      const pageCount = await syncPagePerformance(monthRange);

      totalRecords += dailyCount + keywordCount + pageCount;
      console.log(`Month complete: ${dailyCount + keywordCount + pageCount} records`);

      currentStart = currentEnd;
    }

    await completeSyncLog(syncId, totalRecords, "completed");
    return { success: true, recordsSynced: totalRecords };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Backfill failed:", errorMessage);
    await completeSyncLog(syncId, totalRecords, "failed", errorMessage);
    return { success: false, recordsSynced: totalRecords, error: errorMessage };
  }
}