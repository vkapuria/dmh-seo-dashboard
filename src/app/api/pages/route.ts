import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// Dates to exclude (bad data)
const EXCLUDED_DATES = ["2025-08-21"];

// DMH Page Type Classification (same as keywords)
type DetailedPageType = "home" | "static" | "t1_service" | "t2_service" | "blog" | "writers" | "tools" | "other";

const PAGE_TYPE_LABELS: Record<DetailedPageType, string> = {
  home: "Home",
  static: "Static",
  t1_service: "T1 Service",
  t2_service: "T2 Service",
  blog: "Blog",
  writers: "Writers",
  tools: "Tools",
  other: "Other",
};

const STATIC_SLUGS = [
  "about", "contact", "faq", "how-it-works", "pricing",
  "top-writers", "services", "privacy", "terms", 
  "fair-use-policy", "money-back-guarantee"
];

const T1_SERVICE_SLUGS = [
  "pay-someone-to-do-my-homework", "do-my-homework-online",
  "homework-writing-service", "online-homework-help",
  "professional-homework-help", "essay-writing-service",
  "assignment-help", "buy-essay-online"
];

function classifyPageType(url: string): DetailedPageType {
  const path = url.replace("https://domyhomework.co", "").replace(/\/$/, "") || "/";
  
  if (path === "/" || path === "") return "home";
  if (path.startsWith("/blog")) return "blog";
  if (path.startsWith("/tools")) return "tools";
  if (path.startsWith("/top-writers/") && path !== "/top-writers") return "writers";
  
  const slug = path.replace(/^\//, "").replace(/\/$/, "");
  if (STATIC_SLUGS.includes(slug)) return "static";
  if (T1_SERVICE_SLUGS.includes(slug)) return "t1_service";
  
  if (slug.startsWith("do-my-") || slug.startsWith("write-my-") || slug.includes("-help")) {
    return "t2_service";
  }
  
  return "other";
}

// Types
interface RawPageData {
  page_url: string;
  page_type: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  date: string;
}

interface AggregatedPage {
  page_url: string;
  page_type: DetailedPageType;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  dataPoints: number;
}

interface TypeStats {
  clicks: number;
  impressions: number;
  position: number;
  count: number;
}

// GET /api/pages - Get page performance
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { searchParams } = new URL(request.url);

    const days = parseInt(searchParams.get("days") || "30");
    const limit = parseInt(searchParams.get("limit") || "100");
    const pageType = searchParams.get("type") as DetailedPageType | null;
    const sortBy = searchParams.get("sort") || "clicks";
    const sortOrder = searchParams.get("order") || "desc";
    const search = searchParams.get("search") || "";

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    // Get aggregated page performance over the period (excluding bad dates)
    let query = supabase
      .from("seo_page_performance")
      .select("page_url, page_type, clicks, impressions, ctr, position, date")
      .gte("date", startDateStr)
      .not("date", "in", `(${EXCLUDED_DATES.join(",")})`);

    if (pageType) {
      query = query.eq("page_type", pageType);
    }

    if (search) {
      query = query.ilike("page_url", `%${search}%`);
    }

    const { data: rawPages, error } = await query;

    if (error) throw error;

    // Aggregate by page URL
    const pageMap = new Map();

    for (const row of (rawPages as RawPageData[]) || []) {
      const existing = pageMap.get(row.page_url) as AggregatedPage | undefined;
      const classifiedType = classifyPageType(row.page_url);
      
      if (existing) {
        existing.clicks += row.clicks;
        existing.impressions += row.impressions;
        existing.position += Number(row.position);
        existing.dataPoints += 1;
      } else {
        pageMap.set(row.page_url, {
          page_url: row.page_url,
          page_type: classifiedType,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: Number(row.ctr),
          position: Number(row.position),
          dataPoints: 1,
        } as AggregatedPage);
      }
    }
    
    // Filter by page type if specified
    if (pageType) {
      for (const [url, page] of pageMap.entries()) {
        if ((page as AggregatedPage).page_type !== pageType) {
          pageMap.delete(url);
        }
      }
    }

    // Calculate averages and finalize
    let pages = Array.from(pageMap.values() as Iterable<AggregatedPage>).map((p) => ({
      page_url: p.page_url,
      page_type: p.page_type,
      clicks: p.clicks,
      impressions: p.impressions,
      ctr: p.impressions > 0 ? p.clicks / p.impressions : 0,
      position: p.position / p.dataPoints,
    }));

    // Sort
    const ascending = sortOrder === "asc";
    pages.sort((a, b) => {
      const aVal = a[sortBy as keyof typeof a] as number;
      const bVal = b[sortBy as keyof typeof b] as number;
      return ascending ? aVal - bVal : bVal - aVal;
    });

    // Limit
    pages = pages.slice(0, limit);

    // Get performance by type
    const typeStats = new Map<DetailedPageType, TypeStats>();

    for (const page of Array.from(pageMap.values() as Iterable<AggregatedPage>)) {
      const existing = typeStats.get(page.page_type);
      if (existing) {
        existing.clicks += page.clicks;
        existing.impressions += page.impressions;
        existing.position += page.position / page.dataPoints;
        existing.count += 1;
      } else {
        typeStats.set(page.page_type, {
          clicks: page.clicks,
          impressions: page.impressions,
          position: page.position / page.dataPoints,
          count: 1,
        } as TypeStats);
      }
    }

    const performanceByType = Array.from(typeStats.entries()).map(([type, stats]) => ({
      type: type as DetailedPageType,      
      clicks: (stats as TypeStats).clicks,
      impressions: (stats as TypeStats).impressions,
      ctr: (stats as TypeStats).impressions > 0 ? (stats as TypeStats).clicks / (stats as TypeStats).impressions : 0,
      avgPosition: (stats as TypeStats).position / (stats as TypeStats).count,
      pageCount: (stats as TypeStats).count,
    }));

    return NextResponse.json({
      pages,
      performanceByType,
      pageTypeLabels: PAGE_TYPE_LABELS,
      total: pageMap.size,
      dateRange: {
        start: startDateStr,
        end: new Date().toISOString().split("T")[0],
      },
    });
  } catch (error) {
    console.error("Pages API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}