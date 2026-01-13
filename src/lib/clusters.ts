import { createServerSupabase, createUntypedServerSupabase } from "./supabase";
import type {
  ClusterType,
  ClusterMetrics,
  KeywordCluster,
  InsightPriority,
} from "@/types/database";

const supabase = createServerSupabase();
const untypedSupabase = createUntypedServerSupabase();

// Bad date to exclude from analysis
const EXCLUDED_DATE = "2025-08-21";

// Stop words to filter out when extracting root terms
const STOP_WORDS = new Set([
  "a", "an", "the", "for", "to", "of", "in", "on", "my", "your", "our",
  "do", "get", "can", "how", "what", "where", "when", "who", "which",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "will", "would", "could", "should", "may", "might", "must",
  "and", "or", "but", "if", "then", "because", "as", "so", "that", "this",
  "with", "from", "by", "at", "up", "out", "about", "into", "through",
  "me", "you", "us", "them", "it", "its", "i", "we", "they",
  "best", "top", "good", "free", "online", "cheap", "professional",
]);

// Priority terms for root detection (domain-specific)
const PRIORITY_TERMS = [
  "homework", "assignment", "essay", "writing", "paper", "thesis",
  "dissertation", "coursework", "research", "exam", "quiz", "test",
  "math", "algebra", "calculus", "statistics", "physics", "chemistry",
  "biology", "history", "english", "economics", "accounting", "programming",
  "nursing", "psychology", "sociology", "philosophy", "law", "business",
];

// ============================================
// ROOT TERM EXTRACTION
// ============================================

/**
 * Extract root terms from a list of keywords
 * Groups keywords by their common significant terms
 */
export function extractRootTerms(keywords: string[]): Map<string, string[]> {
  const clusters = new Map<string, string[]>();

  for (const keyword of keywords) {
    // Tokenize and clean
    const words = keyword
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    if (words.length === 0) continue;

    // Find root term: prioritize domain-specific terms, then use first significant word
    let rootTerm = words.find((w) =>
      PRIORITY_TERMS.some((p) => w.includes(p) || p.includes(w))
    );

    if (!rootTerm) {
      // Use longest significant word as root
      rootTerm = words.sort((a, b) => b.length - a.length)[0];
    }

    // Normalize root term (remove common suffixes)
    rootTerm = rootTerm
      .replace(/s$/, "")
      .replace(/ing$/, "")
      .replace(/ed$/, "")
      .replace(/er$/, "")
      .replace(/ment$/, "");

    const existing = clusters.get(rootTerm) || [];
    existing.push(keyword);
    clusters.set(rootTerm, existing);
  }

  return clusters;
}

/**
 * Calculate n-gram similarity between two keywords
 * Returns a score between 0 and 1
 */
export function calculateNgramSimilarity(kw1: string, kw2: string, n: number = 2): number {
  const getNgrams = (str: string): Set<string> => {
    const clean = str.toLowerCase().replace(/[^\w\s]/g, "");
    const ngrams = new Set<string>();
    for (let i = 0; i <= clean.length - n; i++) {
      ngrams.add(clean.substring(i, i + n));
    }
    return ngrams;
  };

  const ngrams1 = getNgrams(kw1);
  const ngrams2 = getNgrams(kw2);

  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

  let intersection = 0;
  for (const ngram of ngrams1) {
    if (ngrams2.has(ngram)) intersection++;
  }

  // Jaccard similarity
  const union = ngrams1.size + ngrams2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ============================================
// AUTHORITY SCORE CALCULATION
// ============================================

/**
 * Calculate Topic Authority Score (0-100)
 * Based on: average position, keyword coverage, impression share, click share
 */
export function calculateAuthorityScore(metrics: {
  avgPosition: number;
  keywordCount: number;
  totalImpressions: number;
  totalClicks: number;
  pageCount: number;
}): number {
  // Position score: higher = better (max 40 points)
  // Position 1 = 40 points, Position 10 = 20 points, Position 20+ = 5 points
  let positionScore: number;
  if (metrics.avgPosition <= 3) {
    positionScore = 40;
  } else if (metrics.avgPosition <= 10) {
    positionScore = 40 - ((metrics.avgPosition - 3) * 2.5);
  } else if (metrics.avgPosition <= 20) {
    positionScore = 20 - ((metrics.avgPosition - 10) * 1.5);
  } else {
    positionScore = Math.max(5, 10 - (metrics.avgPosition - 20) * 0.2);
  }

  // Coverage score: more keywords = better (max 30 points)
  // 1 keyword = 5 points, 10+ keywords = 30 points
  const coverageScore = Math.min(30, 5 + (metrics.keywordCount - 1) * 2.5);

  // Volume score: based on impressions (max 20 points)
  // 100 impressions = 5 points, 10000+ impressions = 20 points
  const volumeScore = Math.min(20, 5 + Math.log10(Math.max(1, metrics.totalImpressions)) * 3);

  // Engagement score: clicks relative to impressions (max 10 points)
  const ctr = metrics.totalImpressions > 0 ? metrics.totalClicks / metrics.totalImpressions : 0;
  const engagementScore = Math.min(10, ctr * 100);

  return Math.round(positionScore + coverageScore + volumeScore + engagementScore);
}

/**
 * Determine health status based on authority score
 */
export function getHealthStatus(score: number): "healthy" | "warning" | "critical" {
  if (score >= 60) return "healthy";
  if (score >= 35) return "warning";
  return "critical";
}

// ============================================
// CLUSTER GENERATION
// ============================================

interface KeywordData {
  query: string;
  page_url: string;
  clicks: number;
  impressions: number;
  position: number;
}

/**
 * Generate root term clusters from keyword data
 */
async function generateRootTermClusters(latestDate: string): Promise<number> {
  // Get all unique keywords from recent data (last 28 days)
  const twentyEightDaysAgo = new Date(latestDate);
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
  const startDate = twentyEightDaysAgo.toISOString().split("T")[0];

  const { data: keywordData } = await supabase
    .from("seo_keyword_rankings")
    .select("query")
    .gte("date", startDate)
    .lte("date", latestDate)
    .neq("date", EXCLUDED_DATE)
    .gt("impressions", 10) as { data: Array<{ query: string }> | null };

  if (!keywordData || keywordData.length === 0) return 0;

  // Get unique keywords
  const uniqueKeywords = [...new Set(keywordData.map((k) => k.query))];

  // Extract root terms and group keywords
  const rootTermGroups = extractRootTerms(uniqueKeywords);

  let clustersCreated = 0;

  // Create clusters for groups with at least 3 keywords
  for (const [rootTerm, keywords] of rootTermGroups) {
    if (keywords.length < 3) continue;

    // Check if cluster already exists
    const { data: existing } = await untypedSupabase
      .from("seo_keyword_clusters")
      .select("id")
      .eq("cluster_type", "root_term")
      .eq("root_term", rootTerm)
      .eq("is_active", true)
      .single();

    let clusterId: string;

    if (existing) {
      // Update existing cluster
      clusterId = existing.id;
      await untypedSupabase
        .from("seo_keyword_clusters")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", clusterId);
    } else {
      // Create new cluster
      const clusterName = `${rootTerm.charAt(0).toUpperCase() + rootTerm.slice(1)} Keywords`;
      const { data: newCluster, error } = await untypedSupabase
        .from("seo_keyword_clusters")
        .insert({
          cluster_name: clusterName,
          cluster_type: "root_term",
          root_term: rootTerm,
          keyword_count: 0, // Will be updated by trigger
          is_active: true,
          metadata: { keywords_analyzed: uniqueKeywords.length },
        })
        .select("id")
        .single();

      if (error || !newCluster) {
        console.error(`Failed to create cluster for "${rootTerm}":`, error?.message);
        continue;
      }

      clusterId = newCluster.id;
      clustersCreated++;
    }

    // Clear existing keywords and re-add (to handle updates)
    await untypedSupabase
      .from("seo_cluster_keywords")
      .delete()
      .eq("cluster_id", clusterId);

    // Add keywords to cluster
    const keywordRecords = keywords.map((query, index) => ({
      cluster_id: clusterId,
      query,
      is_primary: index === 0, // First keyword is primary
    }));

    // Batch insert
    const BATCH_SIZE = 100;
    for (let i = 0; i < keywordRecords.length; i += BATCH_SIZE) {
      const batch = keywordRecords.slice(i, i + BATCH_SIZE);
      await untypedSupabase.from("seo_cluster_keywords").insert(batch);
    }
  }

  return clustersCreated;
}

/**
 * Generate page-based clusters from keyword-page relationships
 */
async function generatePageBasedClusters(latestDate: string): Promise<number> {
  // Get keyword-page relationships from raw data
  const twentyEightDaysAgo = new Date(latestDate);
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
  const startDate = twentyEightDaysAgo.toISOString().split("T")[0];

  const { data: keywordPageData } = await untypedSupabase
    .from("seo_keyword_page_rankings")
    .select("query, page_url, clicks, impressions")
    .gte("date", startDate)
    .lte("date", latestDate)
    .neq("date", EXCLUDED_DATE)
    .gt("impressions", 10);

  if (!keywordPageData || keywordPageData.length === 0) return 0;

  // Group keywords by page
  const pageGroups = new Map<string, Set<string>>();
  for (const row of keywordPageData as KeywordData[]) {
    if (!row.page_url) continue;
    const existing = pageGroups.get(row.page_url) || new Set();
    existing.add(row.query);
    pageGroups.set(row.page_url, existing);
  }

  let clustersCreated = 0;

  // Create clusters for pages with at least 5 keywords
  for (const [pageUrl, keywords] of pageGroups) {
    if (keywords.size < 5) continue;

    // Check if cluster already exists
    const { data: existing } = await untypedSupabase
      .from("seo_keyword_clusters")
      .select("id")
      .eq("cluster_type", "page_based")
      .eq("primary_page_url", pageUrl)
      .eq("is_active", true)
      .single();

    let clusterId: string;

    // Generate cluster name from page URL
    const pagePath = pageUrl.replace("https://domyhomework.co", "").replace(/\/$/, "") || "Home";
    const clusterName = `Page: ${pagePath.slice(0, 50)}${pagePath.length > 50 ? "..." : ""}`;

    if (existing) {
      // Update existing cluster
      clusterId = existing.id;
      await untypedSupabase
        .from("seo_keyword_clusters")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", clusterId);
    } else {
      // Create new cluster
      const { data: newCluster, error } = await untypedSupabase
        .from("seo_keyword_clusters")
        .insert({
          cluster_name: clusterName,
          cluster_type: "page_based",
          primary_page_url: pageUrl,
          keyword_count: 0,
          is_active: true,
          metadata: { page_path: pagePath },
        })
        .select("id")
        .single();

      if (error || !newCluster) {
        console.error(`Failed to create page cluster for "${pageUrl}":`, error?.message);
        continue;
      }

      clusterId = newCluster.id;
      clustersCreated++;
    }

    // Clear existing keywords and re-add
    await untypedSupabase
      .from("seo_cluster_keywords")
      .delete()
      .eq("cluster_id", clusterId);

    // Add keywords to cluster (sorted by most common first)
    const keywordArray = [...keywords];
    const keywordRecords = keywordArray.map((query, index) => ({
      cluster_id: clusterId,
      query,
      is_primary: index === 0,
    }));

    // Batch insert
    const BATCH_SIZE = 100;
    for (let i = 0; i < keywordRecords.length; i += BATCH_SIZE) {
      const batch = keywordRecords.slice(i, i + BATCH_SIZE);
      await untypedSupabase.from("seo_cluster_keywords").insert(batch);
    }
  }

  return clustersCreated;
}

/**
 * Main function to generate all clusters
 */
export async function generateClusters(): Promise<{
  rootTermClusters: number;
  pageBasedClusters: number;
  total: number;
}> {
  // Get latest date in data
  const { data: latestData } = await supabase
    .from("seo_daily_metrics")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .single() as { data: { date: string } | null };

  if (!latestData) {
    return { rootTermClusters: 0, pageBasedClusters: 0, total: 0 };
  }

  const latestDate = latestData.date;
  console.log(`Generating clusters for date: ${latestDate}`);

  // Generate both types of clusters
  const [rootTermClusters, pageBasedClusters] = await Promise.all([
    generateRootTermClusters(latestDate),
    generatePageBasedClusters(latestDate),
  ]);

  console.log(`Generated ${rootTermClusters} root term clusters, ${pageBasedClusters} page-based clusters`);

  return {
    rootTermClusters,
    pageBasedClusters,
    total: rootTermClusters + pageBasedClusters,
  };
}

// ============================================
// CLUSTER METRICS COMPUTATION
// ============================================

/**
 * Get computed metrics for a cluster
 */
export async function getClusterMetrics(
  clusterId: string,
  days: number = 28
): Promise<ClusterMetrics | null> {
  // Get cluster keywords
  const { data: clusterKeywords } = await untypedSupabase
    .from("seo_cluster_keywords")
    .select("query")
    .eq("cluster_id", clusterId);

  if (!clusterKeywords || clusterKeywords.length === 0) {
    return null;
  }

  const keywords = clusterKeywords.map((k: { query: string }) => k.query);

  // Get date ranges
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 2); // GSC 2-day delay
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - days);

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];
  const prevStartDateStr = prevStartDate.toISOString().split("T")[0];
  const prevEndDateStr = prevEndDate.toISOString().split("T")[0];

  // Get current period metrics from keyword-page rankings
  const { data: currentData } = await untypedSupabase
    .from("seo_keyword_page_rankings")
    .select("query, page_url, clicks, impressions, position")
    .in("query", keywords)
    .gte("date", startDateStr)
    .lte("date", endDateStr)
    .neq("date", EXCLUDED_DATE);

  // Get previous period metrics
  const { data: prevData } = await untypedSupabase
    .from("seo_keyword_page_rankings")
    .select("query, clicks, impressions, position")
    .in("query", keywords)
    .gte("date", prevStartDateStr)
    .lte("date", prevEndDateStr)
    .neq("date", EXCLUDED_DATE);

  const currentRecords = (currentData || []) as KeywordData[];
  const prevRecords = (prevData || []) as { query: string; clicks: number; impressions: number; position: number }[];

  // Aggregate current metrics
  const pages = new Set<string>();
  let totalClicks = 0;
  let totalImpressions = 0;
  let positionSum = 0;
  let positionCount = 0;

  const keywordMetrics = new Map<string, { clicks: number; impressions: number; position: number; count: number }>();

  for (const row of currentRecords) {
    if (row.page_url) pages.add(row.page_url);
    totalClicks += row.clicks;
    totalImpressions += row.impressions;
    positionSum += row.position;
    positionCount++;

    const existing = keywordMetrics.get(row.query) || { clicks: 0, impressions: 0, position: 0, count: 0 };
    existing.clicks += row.clicks;
    existing.impressions += row.impressions;
    existing.position += row.position;
    existing.count++;
    keywordMetrics.set(row.query, existing);
  }

  // Aggregate previous period
  let prevClicks = 0;
  let prevImpressions = 0;
  let prevPositionSum = 0;
  let prevPositionCount = 0;

  for (const row of prevRecords) {
    prevClicks += row.clicks;
    prevImpressions += row.impressions;
    prevPositionSum += row.position;
    prevPositionCount++;
  }

  // Calculate trends
  const avgPosition = positionCount > 0 ? positionSum / positionCount : 0;
  const prevAvgPosition = prevPositionCount > 0 ? prevPositionSum / prevPositionCount : 0;
  const positionTrend = prevAvgPosition > 0 ? avgPosition - prevAvgPosition : 0;
  const impressionsTrend = prevImpressions > 0 ? ((totalImpressions - prevImpressions) / prevImpressions) * 100 : 0;
  const clicksTrend = prevClicks > 0 ? ((totalClicks - prevClicks) / prevClicks) * 100 : 0;

  // Calculate authority score
  const authorityScore = calculateAuthorityScore({
    avgPosition,
    keywordCount: keywords.length,
    totalImpressions,
    totalClicks,
    pageCount: pages.size,
  });

  // Find weak keywords (low position or low CTR)
  const weakKeywords: Array<{ query: string; position: number; issue: string }> = [];
  const topKeywords: Array<{ query: string; clicks: number; position: number }> = [];

  for (const [query, metrics] of keywordMetrics) {
    const avgPos = metrics.count > 0 ? metrics.position / metrics.count : 100;
    const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0;

    // Weak if position > 20 or CTR < 1% with high impressions
    if (avgPos > 20) {
      weakKeywords.push({ query, position: avgPos, issue: "Low ranking (page 2+)" });
    } else if (ctr < 0.01 && metrics.impressions > 100) {
      weakKeywords.push({ query, position: avgPos, issue: "Low CTR despite good position" });
    }

    topKeywords.push({ query, clicks: metrics.clicks, position: avgPos });
  }

  // Sort and limit
  weakKeywords.sort((a, b) => b.position - a.position);
  topKeywords.sort((a, b) => b.clicks - a.clicks);

  return {
    cluster_id: clusterId,
    total_clicks: totalClicks,
    total_impressions: totalImpressions,
    avg_position: avgPosition,
    avg_ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
    keyword_count: keywords.length,
    page_count: pages.size,
    position_trend: positionTrend,
    impressions_trend: impressionsTrend,
    clicks_trend: clicksTrend,
    authority_score: authorityScore,
    health_status: getHealthStatus(authorityScore),
    weak_keywords: weakKeywords.slice(0, 5),
    top_keywords: topKeywords.slice(0, 5),
  };
}

// ============================================
// CONTENT GAP DETECTION
// ============================================

/**
 * Detect content gaps for a cluster
 * Returns keyword variations that we don't rank for
 */
export async function detectContentGaps(
  clusterId: string
): Promise<Array<{ keyword: string; reasoning: string; priority: InsightPriority }>> {
  // Get cluster info
  const { data: cluster } = await untypedSupabase
    .from("seo_keyword_clusters")
    .select("cluster_type, root_term, primary_page_url")
    .eq("id", clusterId)
    .single();

  if (!cluster) return [];

  // Get existing keywords in cluster
  const { data: clusterKeywords } = await untypedSupabase
    .from("seo_cluster_keywords")
    .select("query")
    .eq("cluster_id", clusterId);

  const existingKeywords = new Set((clusterKeywords || []).map((k: { query: string }) => k.query.toLowerCase()));

  const gaps: Array<{ keyword: string; reasoning: string; priority: InsightPriority }> = [];

  if (cluster.cluster_type === "root_term" && cluster.root_term) {
    // Generate variations for root term clusters
    const rootTerm = cluster.root_term;
    const variations = [
      `${rootTerm} help`,
      `${rootTerm} service`,
      `${rootTerm} online`,
      `do my ${rootTerm}`,
      `help with ${rootTerm}`,
      `${rootTerm} for me`,
      `best ${rootTerm} help`,
      `cheap ${rootTerm} service`,
      `professional ${rootTerm}`,
      `${rootTerm} writer`,
      `${rootTerm} writing service`,
      `pay someone to do my ${rootTerm}`,
      `${rootTerm} assistance`,
      `urgent ${rootTerm} help`,
    ];

    for (const variation of variations) {
      if (!existingKeywords.has(variation.toLowerCase())) {
        // Check if similar keywords exist with traffic
        const similarPattern = variation.split(" ").slice(0, 2).join("%");
        const { data: similar } = await supabase
          .from("seo_keyword_rankings")
          .select("impressions")
          .ilike("query", `%${similarPattern}%`)
          .gt("impressions", 50)
          .limit(1);

        if (similar && similar.length > 0) {
          gaps.push({
            keyword: variation,
            reasoning: `Similar keywords have traffic. "${variation}" could capture additional search volume.`,
            priority: "medium",
          });
        }
      }
    }
  }

  // Limit to top 10 gaps
  return gaps.slice(0, 10);
}

// ============================================
// WEAK LINK IDENTIFICATION
// ============================================

/**
 * Identify weak keywords in a cluster
 */
export async function identifyWeakLinks(
  clusterId: string,
  threshold: { minPosition?: number; minImpressions?: number } = {}
): Promise<Array<{ query: string; position: number; impressions: number; issue: string }>> {
  const minPosition = threshold.minPosition || 20;
  const minImpressions = threshold.minImpressions || 100;

  // Get cluster keywords with metrics
  const { data: clusterKeywords } = await untypedSupabase
    .from("seo_cluster_keywords")
    .select("query")
    .eq("cluster_id", clusterId);

  if (!clusterKeywords || clusterKeywords.length === 0) return [];

  const keywords = clusterKeywords.map((k: { query: string }) => k.query);

  // Get recent metrics
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 2);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 28);

  const { data: keywordData } = await supabase
    .from("seo_keyword_rankings")
    .select("query, clicks, impressions, position")
    .in("query", keywords)
    .gte("date", startDate.toISOString().split("T")[0])
    .lte("date", endDate.toISOString().split("T")[0])
    .neq("date", EXCLUDED_DATE) as { data: Array<{ query: string; clicks: number; impressions: number; position: number }> | null };

  if (!keywordData) return [];

  // Aggregate by keyword
  const keywordMetrics = new Map<string, { clicks: number; impressions: number; position: number; count: number }>();

  for (const row of keywordData) {
    const existing = keywordMetrics.get(row.query) || { clicks: 0, impressions: 0, position: 0, count: 0 };
    existing.clicks += row.clicks;
    existing.impressions += row.impressions;
    existing.position += row.position;
    existing.count++;
    keywordMetrics.set(row.query, existing);
  }

  const weakLinks: Array<{ query: string; position: number; impressions: number; issue: string }> = [];

  for (const [query, metrics] of keywordMetrics) {
    const avgPosition = metrics.count > 0 ? metrics.position / metrics.count : 100;

    if (avgPosition > minPosition) {
      weakLinks.push({
        query,
        position: avgPosition,
        impressions: metrics.impressions,
        issue: `Ranking at position ${avgPosition.toFixed(1)} (page ${Math.ceil(avgPosition / 10)})`,
      });
    } else if (metrics.impressions > minImpressions && metrics.clicks === 0) {
      weakLinks.push({
        query,
        position: avgPosition,
        impressions: metrics.impressions,
        issue: `${metrics.impressions} impressions but zero clicks`,
      });
    }
  }

  // Sort by position (worst first)
  return weakLinks.sort((a, b) => b.position - a.position).slice(0, 10);
}

// ============================================
// CLUSTER LISTING & RETRIEVAL
// ============================================

/**
 * Get all active clusters with optional filtering
 */
export async function getClusters(options: {
  type?: ClusterType;
  limit?: number;
  sortBy?: "keyword_count" | "created_at" | "updated_at";
  order?: "asc" | "desc";
}): Promise<KeywordCluster[]> {
  let query = untypedSupabase
    .from("seo_keyword_clusters")
    .select("*")
    .eq("is_active", true);

  if (options.type) {
    query = query.eq("cluster_type", options.type);
  }

  const sortBy = options.sortBy || "keyword_count";
  const order = options.order || "desc";
  query = query.order(sortBy, { ascending: order === "asc" });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data } = await query;
  return (data || []) as KeywordCluster[];
}

/**
 * Get a single cluster by ID
 */
export async function getCluster(clusterId: string): Promise<KeywordCluster | null> {
  const { data } = await untypedSupabase
    .from("seo_keyword_clusters")
    .select("*")
    .eq("id", clusterId)
    .single();

  return data as KeywordCluster | null;
}

/**
 * Get keywords belonging to a cluster
 */
export async function getClusterKeywords(
  clusterId: string
): Promise<Array<{ query: string; is_primary: boolean }>> {
  const { data } = await untypedSupabase
    .from("seo_cluster_keywords")
    .select("query, is_primary")
    .eq("cluster_id", clusterId)
    .order("is_primary", { ascending: false });

  return (data || []) as Array<{ query: string; is_primary: boolean }>;
}
