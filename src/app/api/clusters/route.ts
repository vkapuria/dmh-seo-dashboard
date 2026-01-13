import { NextRequest, NextResponse } from "next/server";
import {
  getClusters,
  getClusterMetrics,
  generateClusters,
} from "@/lib/clusters";
import { generateClusterInsights } from "@/lib/cluster-insights";
import type { ClusterType, ClusterWithMetrics } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") as ClusterType | null;
    const limit = parseInt(searchParams.get("limit") || "50");
    const sortBy = (searchParams.get("sort") || "keyword_count") as
      | "keyword_count"
      | "created_at"
      | "updated_at";
    const order = (searchParams.get("order") || "desc") as "asc" | "desc";
    const withMetrics = searchParams.get("metrics") !== "false";

    // Get clusters
    const clusters = await getClusters({
      type: type || undefined,
      limit,
      sortBy,
      order,
    });

    // Optionally compute metrics for each cluster
    let clustersWithMetrics: ClusterWithMetrics[] = [];

    if (withMetrics) {
      clustersWithMetrics = await Promise.all(
        clusters.map(async (cluster) => {
          const metrics = await getClusterMetrics(cluster.id);
          return {
            ...cluster,
            metrics: metrics || {
              cluster_id: cluster.id,
              total_clicks: 0,
              total_impressions: 0,
              avg_position: 0,
              avg_ctr: 0,
              keyword_count: cluster.keyword_count,
              page_count: 0,
              position_trend: 0,
              impressions_trend: 0,
              clicks_trend: 0,
              authority_score: 0,
              health_status: "critical" as const,
              weak_keywords: [],
              top_keywords: [],
            },
          };
        })
      );
    }

    // Calculate summary counts
    const counts = {
      total: clusters.length,
      root_term: clusters.filter((c) => c.cluster_type === "root_term").length,
      page_based: clusters.filter((c) => c.cluster_type === "page_based").length,
      semantic: clusters.filter((c) => c.cluster_type === "semantic").length,
      healthy: withMetrics
        ? clustersWithMetrics.filter((c) => c.metrics.health_status === "healthy").length
        : 0,
      warning: withMetrics
        ? clustersWithMetrics.filter((c) => c.metrics.health_status === "warning").length
        : 0,
      critical: withMetrics
        ? clustersWithMetrics.filter((c) => c.metrics.health_status === "critical").length
        : 0,
    };

    return NextResponse.json({
      clusters: withMetrics ? clustersWithMetrics : clusters,
      counts,
      total: clusters.length,
    });
  } catch (error) {
    console.error("Error fetching clusters:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    if (action === "generate") {
      // Generate clusters
      const clusterResult = await generateClusters();
      console.log(
        `Generated ${clusterResult.rootTermClusters} root term clusters, ${clusterResult.pageBasedClusters} page-based clusters`
      );

      // Generate cluster insights
      const insightResult = await generateClusterInsights();
      console.log(
        `Generated ${insightResult.generated} cluster insights`
      );

      return NextResponse.json({
        success: true,
        clusters: clusterResult,
        insights: insightResult,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use ?action=generate" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error generating clusters:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
