import { createServerSupabase, createUntypedServerSupabase } from "./supabase";
import {
  getClusters,
  getClusterMetrics,
  detectContentGaps,
  identifyWeakLinks,
  getClusterKeywords,
} from "./clusters";
import type {
  ClusterInsightType,
  InsightPriority,
  InsightEvidence,
  InsightAffectedItem,
  KeywordCluster,
  ClusterMetrics,
} from "@/types/database";

const supabase = createServerSupabase();
const untypedSupabase = createUntypedServerSupabase();

// Bad date to exclude from analysis
const EXCLUDED_DATE = "2025-08-21";

interface ClusterInsightInput {
  cluster_id: string;
  insight_type: ClusterInsightType;
  title: string;
  description: string;
  suggested_action: string;
  evidence: InsightEvidence[];
  affected_items: InsightAffectedItem[];
  priority: InsightPriority;
  confidence_score: number;
  insight_key: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// INSIGHT GENERATORS
// ============================================

/**
 * Generate content gap insights
 * Identifies missing keyword variations in clusters
 */
async function generateContentGapInsights(
  clusters: KeywordCluster[]
): Promise<ClusterInsightInput[]> {
  const insights: ClusterInsightInput[] = [];

  for (const cluster of clusters) {
    if (cluster.cluster_type !== "root_term") continue;

    const gaps = await detectContentGaps(cluster.id);

    if (gaps.length >= 3) {
      insights.push({
        cluster_id: cluster.id,
        insight_type: "content_gap",
        title: `Content Gap: ${cluster.cluster_name}`,
        description: `Found ${gaps.length} potential keyword variations for "${cluster.root_term}" that you don't rank for. These could represent untapped search volume.`,
        suggested_action: "Create targeted content or optimize existing pages to capture these keyword variations.",
        evidence: gaps.slice(0, 5).map((gap) => ({
          metric: "Missing Keyword",
          value: gap.keyword,
          context: gap.reasoning,
        })),
        affected_items: gaps.slice(0, 5).map((gap) => ({
          type: "keyword" as const,
          identifier: gap.keyword,
        })),
        priority: gaps.length >= 5 ? "high" : "medium",
        confidence_score: 0.75,
        insight_key: `content_gap_${cluster.id}`,
        metadata: { gap_count: gaps.length, root_term: cluster.root_term },
      });
    }
  }

  return insights;
}

/**
 * Generate weak link insights
 * Identifies underperforming keywords in clusters
 */
async function generateWeakLinkInsights(
  clusters: KeywordCluster[]
): Promise<ClusterInsightInput[]> {
  const insights: ClusterInsightInput[] = [];

  for (const cluster of clusters) {
    if (cluster.keyword_count < 5) continue;

    const weakLinks = await identifyWeakLinks(cluster.id);

    if (weakLinks.length >= 2) {
      const metrics = await getClusterMetrics(cluster.id);
      const isStrongCluster = metrics && metrics.authority_score >= 50;

      if (isStrongCluster) {
        insights.push({
          cluster_id: cluster.id,
          insight_type: "weak_link",
          title: `Weak Links in Strong Cluster: ${cluster.cluster_name}`,
          description: `This cluster has a strong authority score (${metrics.authority_score}), but ${weakLinks.length} keywords are underperforming. Fixing these could significantly boost overall cluster performance.`,
          suggested_action: "Focus optimization efforts on the weak keywords listed below to strengthen the entire cluster.",
          evidence: weakLinks.slice(0, 5).map((link) => ({
            metric: link.query,
            value: `Position ${link.position.toFixed(1)}`,
            context: link.issue,
          })),
          affected_items: weakLinks.slice(0, 5).map((link) => ({
            type: "keyword" as const,
            identifier: link.query,
          })),
          priority: weakLinks.length >= 4 ? "high" : "medium",
          confidence_score: 0.8,
          insight_key: `weak_link_${cluster.id}`,
          metadata: {
            weak_count: weakLinks.length,
            cluster_authority: metrics.authority_score,
          },
        });
      }
    }
  }

  return insights;
}

/**
 * Generate authority score insights
 * Tracks clusters gaining or losing topic authority
 */
async function generateAuthorityScoreInsights(
  clusters: KeywordCluster[]
): Promise<ClusterInsightInput[]> {
  const insights: ClusterInsightInput[] = [];

  for (const cluster of clusters) {
    if (cluster.keyword_count < 3) continue;

    const metrics = await getClusterMetrics(cluster.id);
    if (!metrics) continue;

    // High authority clusters (opportunity to protect)
    if (metrics.authority_score >= 70 && metrics.position_trend > 2) {
      insights.push({
        cluster_id: cluster.id,
        insight_type: "authority_score",
        title: `Authority Declining: ${cluster.cluster_name}`,
        description: `This high-authority cluster (score: ${metrics.authority_score}) is showing signs of decline. Average position dropped ${metrics.position_trend.toFixed(1)} positions vs. previous period.`,
        suggested_action: "Investigate competitive pressure, content freshness, and technical issues for keywords in this cluster.",
        evidence: [
          { metric: "Authority Score", value: metrics.authority_score },
          { metric: "Position Trend", value: `+${metrics.position_trend.toFixed(1)} (worsening)` },
          { metric: "Impressions Trend", value: `${metrics.impressions_trend >= 0 ? "+" : ""}${metrics.impressions_trend.toFixed(0)}%` },
          { metric: "Keywords", value: metrics.keyword_count },
          { metric: "Pages", value: metrics.page_count },
        ],
        affected_items: metrics.top_keywords.slice(0, 3).map((kw) => ({
          type: "keyword" as const,
          identifier: kw.query,
        })),
        priority: "high",
        confidence_score: 0.85,
        insight_key: `authority_decline_${cluster.id}`,
        metadata: { authority_score: metrics.authority_score, position_trend: metrics.position_trend },
      });
    }

    // Rising clusters (opportunity to capitalize)
    if (metrics.authority_score >= 40 && metrics.position_trend < -3) {
      insights.push({
        cluster_id: cluster.id,
        insight_type: "authority_score",
        title: `Authority Rising: ${cluster.cluster_name}`,
        description: `This cluster is gaining momentum! Authority score: ${metrics.authority_score}, positions improved by ${Math.abs(metrics.position_trend).toFixed(1)} on average.`,
        suggested_action: "Double down on content in this cluster. Add internal links and consider creating supporting content.",
        evidence: [
          { metric: "Authority Score", value: metrics.authority_score },
          { metric: "Position Trend", value: `${metrics.position_trend.toFixed(1)} (improving)` },
          { metric: "Clicks Trend", value: `${metrics.clicks_trend >= 0 ? "+" : ""}${metrics.clicks_trend.toFixed(0)}%` },
          { metric: "Keywords", value: metrics.keyword_count },
        ],
        affected_items: metrics.top_keywords.slice(0, 3).map((kw) => ({
          type: "keyword" as const,
          identifier: kw.query,
        })),
        priority: "medium",
        confidence_score: 0.8,
        insight_key: `authority_rising_${cluster.id}`,
        metadata: { authority_score: metrics.authority_score, position_trend: metrics.position_trend },
      });
    }

    // Low authority clusters with potential (opportunity)
    if (metrics.authority_score < 30 && metrics.total_impressions > 1000) {
      insights.push({
        cluster_id: cluster.id,
        insight_type: "authority_score",
        title: `Underperforming Cluster: ${cluster.cluster_name}`,
        description: `This cluster has high visibility (${metrics.total_impressions.toLocaleString()} impressions) but low authority (score: ${metrics.authority_score}). Significant improvement potential exists.`,
        suggested_action: "Review content quality, optimize for featured snippets, and strengthen internal linking for this topic.",
        evidence: [
          { metric: "Authority Score", value: metrics.authority_score },
          { metric: "Total Impressions", value: metrics.total_impressions.toLocaleString() },
          { metric: "Average Position", value: metrics.avg_position.toFixed(1) },
          { metric: "CTR", value: `${(metrics.avg_ctr * 100).toFixed(2)}%` },
        ],
        affected_items: metrics.weak_keywords.slice(0, 3).map((kw) => ({
          type: "keyword" as const,
          identifier: kw.query,
        })),
        priority: metrics.total_impressions > 5000 ? "high" : "medium",
        confidence_score: 0.75,
        insight_key: `authority_underperforming_${cluster.id}`,
        metadata: { authority_score: metrics.authority_score, impressions: metrics.total_impressions },
      });
    }
  }

  return insights;
}

/**
 * Generate cannibalization insights
 * Identifies when multiple pages compete for the same cluster
 */
async function generateCannibalizationInsights(
  clusters: KeywordCluster[]
): Promise<ClusterInsightInput[]> {
  const insights: ClusterInsightInput[] = [];

  for (const cluster of clusters) {
    if (cluster.cluster_type !== "root_term") continue;
    if (cluster.keyword_count < 5) continue;

    const metrics = await getClusterMetrics(cluster.id);
    if (!metrics || metrics.page_count < 3) continue;

    // Multiple pages competing for the same cluster
    if (metrics.page_count >= 4 && metrics.authority_score < 50) {
      insights.push({
        cluster_id: cluster.id,
        insight_type: "cannibalization",
        title: `Cannibalization Risk: ${cluster.cluster_name}`,
        description: `${metrics.page_count} different pages are ranking for keywords in this cluster. This dilutes ranking signals and may be hurting performance.`,
        suggested_action: "Consolidate content into one authoritative page, or clearly differentiate each page's target intent.",
        evidence: [
          { metric: "Competing Pages", value: metrics.page_count },
          { metric: "Authority Score", value: metrics.authority_score },
          { metric: "Average Position", value: metrics.avg_position.toFixed(1) },
          { metric: "Total Keywords", value: metrics.keyword_count },
        ],
        affected_items: [
          { type: "keyword" as const, identifier: cluster.root_term || cluster.cluster_name },
        ],
        priority: metrics.page_count >= 5 ? "high" : "medium",
        confidence_score: 0.7,
        insight_key: `cannibalization_${cluster.id}`,
        metadata: { page_count: metrics.page_count, authority_score: metrics.authority_score },
      });
    }
  }

  return insights;
}

/**
 * Generate coverage decline insights
 * Identifies clusters losing keyword breadth
 */
async function generateCoverageDeclineInsights(
  clusters: KeywordCluster[]
): Promise<ClusterInsightInput[]> {
  const insights: ClusterInsightInput[] = [];

  // Get current and previous period keyword counts
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 2);
  const currentStart = new Date(endDate);
  currentStart.setDate(currentStart.getDate() - 28);

  const prevEnd = new Date(currentStart);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - 28);

  for (const cluster of clusters) {
    if (cluster.keyword_count < 5) continue;

    const clusterKeywords = await getClusterKeywords(cluster.id);
    const keywords = clusterKeywords.map((k) => k.query);

    // Count keywords with impressions in current period
    const { count: currentCount } = await supabase
      .from("seo_keyword_rankings")
      .select("query", { count: "exact", head: true })
      .in("query", keywords)
      .gte("date", currentStart.toISOString().split("T")[0])
      .lte("date", endDate.toISOString().split("T")[0])
      .neq("date", EXCLUDED_DATE)
      .gt("impressions", 10);

    // Count keywords in previous period
    const { count: prevCount } = await supabase
      .from("seo_keyword_rankings")
      .select("query", { count: "exact", head: true })
      .in("query", keywords)
      .gte("date", prevStart.toISOString().split("T")[0])
      .lte("date", prevEnd.toISOString().split("T")[0])
      .neq("date", EXCLUDED_DATE)
      .gt("impressions", 10);

    const current = currentCount || 0;
    const prev = prevCount || 0;

    if (prev > 0 && current < prev * 0.7) {
      // Lost 30%+ of keyword coverage
      const lostCount = prev - current;
      const lostPercentage = ((prev - current) / prev) * 100;

      insights.push({
        cluster_id: cluster.id,
        insight_type: "coverage_decline",
        title: `Coverage Decline: ${cluster.cluster_name}`,
        description: `This cluster lost ${lostPercentage.toFixed(0)}% of its keyword coverage (${lostCount} keywords no longer ranking). This indicates weakening topical authority.`,
        suggested_action: "Audit content freshness, check for technical issues, and analyze competitor movements.",
        evidence: [
          { metric: "Previous Keywords", value: prev },
          { metric: "Current Keywords", value: current },
          { metric: "Keywords Lost", value: lostCount },
          { metric: "Coverage Change", value: `-${lostPercentage.toFixed(0)}%` },
        ],
        affected_items: [
          { type: "keyword" as const, identifier: cluster.root_term || cluster.cluster_name },
        ],
        priority: lostPercentage >= 50 ? "critical" : "high",
        confidence_score: 0.85,
        insight_key: `coverage_decline_${cluster.id}`,
        metadata: { prev_count: prev, current_count: current, lost_percentage: lostPercentage },
      });
    }
  }

  return insights;
}

// ============================================
// MAIN INSIGHT GENERATION
// ============================================

export async function generateClusterInsights(): Promise<{
  generated: number;
  expired: number;
  error?: string;
}> {
  try {
    // Get all active clusters
    const clusters = await getClusters({ limit: 100 });
    console.log(`Generating insights for ${clusters.length} clusters`);

    if (clusters.length === 0) {
      return { generated: 0, expired: 0 };
    }

    // Generate all insights in parallel
    const [
      contentGapInsights,
      weakLinkInsights,
      authorityScoreInsights,
      cannibalizationInsights,
      coverageDeclineInsights,
    ] = await Promise.all([
      generateContentGapInsights(clusters),
      generateWeakLinkInsights(clusters),
      generateAuthorityScoreInsights(clusters),
      generateCannibalizationInsights(clusters),
      generateCoverageDeclineInsights(clusters),
    ]);

    const allInsights = [
      ...contentGapInsights,
      ...weakLinkInsights,
      ...authorityScoreInsights,
      ...cannibalizationInsights,
      ...coverageDeclineInsights,
    ];

    console.log(`Generated ${allInsights.length} raw cluster insights`);

    // Expire old insights
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: expiredInsights } = await untypedSupabase
      .from("seo_cluster_insights")
      .update({ status: "expired", expires_at: new Date().toISOString() })
      .eq("status", "active")
      .lt("created_at", sevenDaysAgo.toISOString())
      .select("id");

    const expiredCount = expiredInsights?.length || 0;

    // Insert or update insights
    let insertedCount = 0;

    for (const insight of allInsights) {
      // Check if active insight with this key already exists
      const { data: existing } = await untypedSupabase
        .from("seo_cluster_insights")
        .select("id")
        .eq("insight_key", insight.insight_key)
        .eq("status", "active")
        .single();

      const insightData = {
        cluster_id: insight.cluster_id,
        insight_type: insight.insight_type,
        title: insight.title,
        description: insight.description,
        suggested_action: insight.suggested_action,
        evidence: insight.evidence,
        affected_items: insight.affected_items,
        priority: insight.priority,
        confidence_score: insight.confidence_score,
        status: "active",
        insight_key: insight.insight_key,
        metadata: insight.metadata || {},
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existing?.id) {
        // Update existing insight
        const result = await untypedSupabase
          .from("seo_cluster_insights")
          .update(insightData)
          .eq("id", existing.id);
        error = result.error;
      } else {
        // Insert new insight
        const result = await untypedSupabase
          .from("seo_cluster_insights")
          .insert(insightData);
        error = result.error;
      }

      if (error) {
        console.error(`Failed to ${existing ? "update" : "insert"} cluster insight "${insight.title}":`, error.message);
      } else {
        insertedCount++;
      }
    }

    console.log(`Inserted/updated ${insertedCount} cluster insights, expired ${expiredCount}`);

    return { generated: insertedCount, expired: expiredCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Cluster insight generation failed:", errorMessage);
    return { generated: 0, expired: 0, error: errorMessage };
  }
}

// ============================================
// INSIGHT MANAGEMENT
// ============================================

export async function getClusterInsights(options: {
  clusterId?: string;
  type?: ClusterInsightType;
  priority?: InsightPriority;
  status?: string;
  limit?: number;
}): Promise<{ insights: any[]; counts: Record<string, number> }> {
  let query = untypedSupabase
    .from("seo_cluster_insights")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (options.clusterId) query = query.eq("cluster_id", options.clusterId);
  if (options.type) query = query.eq("insight_type", options.type);
  if (options.priority) query = query.eq("priority", options.priority);
  if (options.status) query = query.eq("status", options.status);
  else query = query.eq("status", "active");
  if (options.limit) query = query.limit(options.limit);

  const { data: insights } = await query;

  // Get counts by type
  const { data: countData } = await untypedSupabase
    .from("seo_cluster_insights")
    .select("insight_type, priority")
    .eq("status", "active");

  const typedCountData = countData as Array<{ insight_type: string; priority: string }> | null;
  const counts = {
    total: typedCountData?.length || 0,
    content_gap: typedCountData?.filter((i) => i.insight_type === "content_gap").length || 0,
    weak_link: typedCountData?.filter((i) => i.insight_type === "weak_link").length || 0,
    authority_score: typedCountData?.filter((i) => i.insight_type === "authority_score").length || 0,
    cannibalization: typedCountData?.filter((i) => i.insight_type === "cannibalization").length || 0,
    coverage_decline: typedCountData?.filter((i) => i.insight_type === "coverage_decline").length || 0,
    critical: typedCountData?.filter((i) => i.priority === "critical").length || 0,
    high: typedCountData?.filter((i) => i.priority === "high").length || 0,
  };

  return { insights: insights || [], counts };
}

export async function dismissClusterInsight(id: string): Promise<boolean> {
  const { error } = await untypedSupabase
    .from("seo_cluster_insights")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .eq("id", id);

  return !error;
}

export async function completeClusterInsight(id: string): Promise<boolean> {
  const { error } = await untypedSupabase
    .from("seo_cluster_insights")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", id);

  return !error;
}
