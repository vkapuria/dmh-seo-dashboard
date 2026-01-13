import { NextRequest, NextResponse } from "next/server";
import {
  getCluster,
  getClusterMetrics,
  getClusterKeywords,
  detectContentGaps,
  identifyWeakLinks,
} from "@/lib/clusters";
import { getClusterInsights } from "@/lib/cluster-insights";
import { createServerSupabase } from "@/lib/supabase";

const supabase = createServerSupabase();
const EXCLUDED_DATE = "2025-08-21";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clusterId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const include = searchParams.get("include")?.split(",") || [];

    // Get cluster
    const cluster = await getCluster(clusterId);

    if (!cluster) {
      return NextResponse.json(
        { error: "Cluster not found" },
        { status: 404 }
      );
    }

    // Get cluster metrics
    const metrics = await getClusterMetrics(clusterId);

    // Get cluster keywords
    const keywords = await getClusterKeywords(clusterId);

    // Build response
    const response: Record<string, unknown> = {
      cluster,
      metrics,
      keywords,
    };

    // Optionally include additional data
    if (include.includes("gaps") || include.includes("all")) {
      response.contentGaps = await detectContentGaps(clusterId);
    }

    if (include.includes("weak") || include.includes("all")) {
      response.weakLinks = await identifyWeakLinks(clusterId);
    }

    if (include.includes("insights") || include.includes("all")) {
      const { insights } = await getClusterInsights({ clusterId });
      response.insights = insights;
    }

    if (include.includes("keyword_metrics") || include.includes("all")) {
      // Get detailed keyword metrics for the cluster
      const keywordQueries = keywords.map((k) => k.query);

      if (keywordQueries.length > 0) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 2);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 28);

        const { data: keywordData } = await supabase
          .from("seo_keyword_rankings")
          .select("query, clicks, impressions, ctr, position, page_url")
          .in("query", keywordQueries)
          .gte("date", startDate.toISOString().split("T")[0])
          .lte("date", endDate.toISOString().split("T")[0])
          .neq("date", EXCLUDED_DATE) as { data: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number; page_url: string | null }> | null };

        // Aggregate by keyword
        const keywordMetrics = new Map<
          string,
          {
            query: string;
            clicks: number;
            impressions: number;
            ctr: number;
            position: number;
            page_url: string | null;
            count: number;
          }
        >();

        for (const row of keywordData || []) {
          const existing = keywordMetrics.get(row.query) || {
            query: row.query,
            clicks: 0,
            impressions: 0,
            ctr: 0,
            position: 0,
            page_url: row.page_url,
            count: 0,
          };
          existing.clicks += row.clicks;
          existing.impressions += row.impressions;
          existing.position += row.position;
          existing.count++;
          keywordMetrics.set(row.query, existing);
        }

        // Calculate averages
        const keywordMetricsArray = Array.from(keywordMetrics.values()).map(
          (m) => ({
            query: m.query,
            clicks: m.clicks,
            impressions: m.impressions,
            ctr: m.impressions > 0 ? m.clicks / m.impressions : 0,
            position: m.count > 0 ? m.position / m.count : 0,
            page_url: m.page_url,
          })
        );

        response.keywordMetrics = keywordMetricsArray.sort(
          (a, b) => b.clicks - a.clicks
        );
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching cluster:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
