import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// Dates to exclude (bad data)
const EXCLUDED_DATES = ["2025-08-21"];

// DMH Page Type Classification
type PageType = "home" | "static" | "t1_service" | "t2_service" | "blog" | "writers" | "tools" | "other";

// T1 Service slugs (main service pages)
const T1_SERVICE_SLUGS = [
  "pay-someone-to-do-my-homework",
  "do-my-homework-online",
  "homework-writing-service",
  "online-homework-help",
  "professional-homework-help",
  "essay-writing-service",
  "assignment-help",
  "buy-essay-online",
];

// Static page slugs
const STATIC_SLUGS = [
  "about",
  "contact",
  "faq",
  "how-it-works",
  "pricing",
  "top-writers",
  "services",
  "privacy",
  "terms",
  "fair-use-policy",
  "money-back-guarantee",
];

// Classify a URL into page type
function classifyPageType(url: string): PageType {
  const path = url.replace("https://domyhomework.co", "").replace(/\/$/, "") || "/";
  
  // Home
  if (path === "/" || path === "") return "home";
  
  // Blog posts
  if (path.startsWith("/blog/")) return "blog";
  
  // Tools
  if (path.startsWith("/tools")) return "tools";
  
  // Writer profiles (individual writers, not the listing page)
  if (path.startsWith("/top-writers/") && path !== "/top-writers") return "writers";
  
  // Extract slug from path
  const slug = path.replace(/^\//, "").replace(/\/$/, "");
  
  // Static pages
  if (STATIC_SLUGS.includes(slug)) return "static";
  
  // T1 Service pages
  if (T1_SERVICE_SLUGS.includes(slug)) return "t1_service";
  
  // T2 Service pages (do-my-X-homework pattern or other service patterns)
  if (slug.startsWith("do-my-") || 
      slug.startsWith("write-my-") || 
      slug.includes("-writing-service") ||
      slug.includes("-help")) {
    return "t2_service";
  }
  
  // Other (pay-now, stripe-checkout, etc.)
  return "other";
}

// Page type display names
const PAGE_TYPE_LABELS: Record<PageType, string> = {
  home: "Home",
  static: "Static Pages",
  t1_service: "T1 Service",
  t2_service: "T2 Service",
  blog: "Blog",
  writers: "Writers",
  tools: "Tools",
  other: "Other",
};

// GET /api/keywords - Get keyword rankings
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { searchParams } = new URL(request.url);

    const compareDays = parseInt(searchParams.get("compareDays") || searchParams.get("days") || "7");
    const limit = parseInt(searchParams.get("limit") || "100");
    const sortBy = searchParams.get("sort") || "clicks";
    const sortOrder = searchParams.get("order") || "desc";
    const search = searchParams.get("search") || "";
    const pageUrl = searchParams.get("pageUrl") || "";
    const pageType = searchParams.get("pageType") || "";
    const minImpressions = parseInt(searchParams.get("minImpressions") || "0");
    const country = searchParams.get("country");
    const device = searchParams.get("device");

    // Get the latest date in our data
    const { data: latestDateData } = await supabase
      .from("seo_keyword_rankings")
      .select("date")
      .order("date", { ascending: false })
      .limit(1)
      .single() as { data: { date: string } | null };

    if (!latestDateData) {
      return NextResponse.json({ keywords: [], latestDate: null, pagesByType: {}, pageTypeLabels: PAGE_TYPE_LABELS });
    }

    const latestDate = latestDateData.date;

    // Get distinct pages for dropdown filter
    const { data: pagesData } = await supabase
      .from("seo_keyword_rankings")
      .select("page_url")
      .eq("date", latestDate as string)
      .not("page_url", "is", null) as { data: { page_url: string }[] | null };

    const uniquePages = [...new Set((pagesData || []).map((p: { page_url: string }) => p.page_url).filter(Boolean))] as string[];
    
    // Group pages by type
    const pagesByType: Record<PageType, string[]> = {
      home: [],
      static: [],
      t1_service: [],
      t2_service: [],
      blog: [],
      writers: [],
      tools: [],
      other: [],
    };
    
    uniquePages.forEach((url) => {
      const type = classifyPageType(url);
      pagesByType[type].push(url);
    });
    
    // Sort pages within each type
    Object.keys(pagesByType).forEach((type) => {
      pagesByType[type as PageType].sort();
    });

    // Calculate date ranges
    const currentPeriodStart = new Date(latestDate);
    currentPeriodStart.setDate(currentPeriodStart.getDate() - compareDays + 1);
    const currentStartStr = currentPeriodStart.toISOString().split("T")[0];

    const previousPeriodEnd = new Date(currentPeriodStart);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
    const prevEndStr = previousPeriodEnd.toISOString().split("T")[0];

    const previousPeriodStart = new Date(previousPeriodEnd);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - compareDays + 1);
    const prevStartStr = previousPeriodStart.toISOString().split("T")[0];

    // Determine which table to use based on filters
    // Country and Device are mutually exclusive - country takes priority
    let tableName = "seo_keyword_rankings";
    let activeCountry = country;
    let activeDevice = device;

    if (country && device) {
      // Can't filter by both - country takes priority, ignore device
      activeDevice = null;
    }

    if (activeCountry) {
      tableName = "seo_keyword_rankings_by_country";
    } else if (activeDevice) {
      tableName = "seo_keyword_rankings_by_device";
    }

    // Build query for CURRENT period (aggregate over compareDays)
    let currentQuery = supabase
      .from(tableName)
      .select("query, page_url, clicks, impressions, ctr, position, date")
      .gte("date", currentStartStr)
      .lte("date", latestDate)
      .not("date", "in", `(${EXCLUDED_DATES.join(",")})`);

      if (activeCountry) {
        currentQuery = currentQuery.eq("country", activeCountry);
      }
      
      if (activeDevice) {
        currentQuery = currentQuery.eq("device", activeDevice);
      }

    if (search) {
      currentQuery = currentQuery.ilike("query", `%${search}%`);
    }

    if (pageUrl) {
      currentQuery = currentQuery.eq("page_url", pageUrl);
    } else if (pageType && pagesByType[pageType as PageType]?.length > 0) {
      currentQuery = currentQuery.in("page_url", pagesByType[pageType as PageType]);
    }

    const { data: currentRawData, error } = await currentQuery.limit(10000);

    if (error) throw error;

    // Aggregate current period data by query
    const currentAggregated = new Map<string, {
      query: string;
      page_url: string | null;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
      positionSum: number;
      positionCount: number;
    }>();

    currentRawData?.forEach((row: any) => {
      const existing = currentAggregated.get(row.query);
      if (existing) {
        existing.clicks += row.clicks;
        existing.impressions += row.impressions;
        existing.positionSum += row.position;
        existing.positionCount += 1;
      } else {
        currentAggregated.set(row.query, {
          query: row.query,
          page_url: row.page_url,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
          positionSum: row.position,
          positionCount: 1,
        });
      }
    });

    // Build query for PREVIOUS period
    let prevQuery = supabase
      .from(tableName)
      .select("query, clicks, impressions, position")
      .gte("date", prevStartStr)
      .lte("date", prevEndStr)
      .not("date", "in", `(${EXCLUDED_DATES.join(",")})`);

      if (activeCountry) {
        prevQuery = prevQuery.eq("country", activeCountry);
      }
      
      if (activeDevice) {
        prevQuery = prevQuery.eq("device", activeDevice);
      }

    if (search) {
      prevQuery = prevQuery.ilike("query", `%${search}%`);
    }

    if (pageUrl) {
      prevQuery = prevQuery.eq("page_url", pageUrl);
    } else if (pageType && pagesByType[pageType as PageType]?.length > 0) {
      prevQuery = prevQuery.in("page_url", pagesByType[pageType as PageType]);
    }

    const { data: prevRawData } = await prevQuery.limit(10000);

    // Aggregate previous period data
    const prevAggregated = new Map<string, {
      clicks: number;
      impressions: number;
      positionSum: number;
      positionCount: number;
    }>();

    prevRawData?.forEach((row: any) => {
      const existing = prevAggregated.get(row.query);
      if (existing) {
        existing.clicks += row.clicks;
        existing.impressions += row.impressions;
        existing.positionSum += row.position;
        existing.positionCount += 1;
      } else {
        prevAggregated.set(row.query, {
          clicks: row.clicks,
          impressions: row.impressions,
          positionSum: row.position,
          positionCount: 1,
        });
      }
    });

    // Build final keywords array with comparisons
    let keywords = Array.from(currentAggregated.values()).map((current) => {
      const avgPosition = current.positionSum / current.positionCount;
      const avgCtr = current.impressions > 0 ? (current.clicks / current.impressions) * 100 : 0;
      
      const prev = prevAggregated.get(current.query);
      const prevAvgPosition = prev ? prev.positionSum / prev.positionCount : 0;

      return {
        id: current.query,
        date: latestDate,
        query: current.query,
        page_url: current.page_url,
        clicks: current.clicks,
        impressions: current.impressions,
        ctr: avgCtr,
        position: avgPosition,
        created_at: new Date().toISOString(),
        positionChange: prev ? prevAvgPosition - avgPosition : 0,
        clicksChange: prev ? current.clicks - prev.clicks : current.clicks,
        impressionsChange: prev ? current.impressions - prev.impressions : current.impressions,
        isNew: !prev,
      };
    });

    // Filter by minimum impressions AFTER aggregation
    keywords = keywords.filter(k => k.impressions >= minImpressions);

    // Sort
    const ascending = sortOrder === "asc";
    keywords.sort((a, b) => {
      const aVal = a[sortBy as keyof typeof a] as number;
      const bVal = b[sortBy as keyof typeof b] as number;
      return ascending ? aVal - bVal : bVal - aVal;
    });

    // Limit
    keywords = keywords.slice(0, limit);

    // Get top gainers and losers (from full aggregated data, not limited)
    const allKeywordsForStats = Array.from(currentAggregated.values()).map((current) => {
      const avgPosition = current.positionSum / current.positionCount;
      const prev = prevAggregated.get(current.query);
      const prevAvgPosition = prev ? prev.positionSum / prev.positionCount : 0;
      return {
        query: current.query,
        position: avgPosition,
        clicks: current.clicks,
        impressions: current.impressions,
        positionChange: prev ? prevAvgPosition - avgPosition : 0,
        isNew: !prev,
      };
    });

    const gainers = allKeywordsForStats
      .filter((k) => k.positionChange > 0)
      .sort((a, b) => b.positionChange - a.positionChange)
      .slice(0, 10);

    const losers = allKeywordsForStats
      .filter((k) => k.positionChange < 0)
      .sort((a, b) => a.positionChange - b.positionChange)
      .slice(0, 10);

    const newKeywords = allKeywordsForStats
      .filter((k) => k.isNew && k.position <= 50)
      .sort((a, b) => a.position - b.position)
      .slice(0, 10);

    return NextResponse.json({
      keywords,
      latestDate,
      currentPeriodStart: currentStartStr,
      currentPeriodEnd: latestDate,
      previousPeriodStart: prevStartStr,
      previousPeriodEnd: prevEndStr,
      compareDays,
      gainers,
      losers,
      newKeywords,
      pagesByType,
      pageTypeLabels: PAGE_TYPE_LABELS,
      total: keywords?.length || 0,
    });
  } catch (error) {
    console.error("Keywords API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
