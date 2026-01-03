import { createServerSupabase } from "./supabase";
import type {
  InsightCategory,
  InsightType,
  InsightPriority,
  InsightEvidence,
  InsightAffectedItem,
  InsightImpactEstimate,
} from "@/types/database";

const supabase = createServerSupabase();

// Constants
const HOMEPAGE_URL = "https://domyhomework.co/";
const HOMEPAGE_PATTERN = /^https:\/\/domyhomework\.co\/?$/;

// Thresholds for high-value keywords
const HIGH_VALUE_THRESHOLDS = {
  clicks28d: 50,
  impressions28d: 1000,
  risingStarPositionGain: 5,
  risingStarMinClicks: 20,
};

// Thresholds for insights
const INSIGHT_THRESHOLDS = {
  // Strike distance
  strikeDistanceMinPosition: 11,
  strikeDistanceMaxPosition: 20,
  strikeDistanceMinImpressions: 100,

  // CTR optimization
  ctrOptimizationMinImpressions: 500,
  ctrOptimizationGapPercent: 50, // CTR is 50% below expected

  // Position drops
  homepagePositionDropThreshold: 3,
  coreKeywordDropThreshold: 3,
  regularKeywordDropThreshold: 5,

  // Traffic anomaly
  trafficAnomalyThresholdPercent: 25,

  // Approaching page 2
  approachingPageTwoMinPosition: 8,
  approachingPageTwoMaxPosition: 10,

  // Concentration risk
  concentrationRiskTopKeywords: 5,
  concentrationRiskThresholdPercent: 40,

  // Untapped impressions
  untappedMinImpressions: 2000,
  untappedMaxCtr: 0.02, // 2%
};

// Expected CTR by position (industry averages)
const EXPECTED_CTR_BY_POSITION: Record<number, number> = {
  1: 0.28,
  2: 0.15,
  3: 0.11,
  4: 0.08,
  5: 0.065,
  6: 0.05,
  7: 0.04,
  8: 0.035,
  9: 0.03,
  10: 0.025,
};

function getExpectedCtr(position: number): number {
  const roundedPosition = Math.round(position);
  if (roundedPosition <= 0) return 0.28;
  if (roundedPosition > 10) return 0.01;
  return EXPECTED_CTR_BY_POSITION[roundedPosition] || 0.01;
}

interface InsightToCreate {
  category: InsightCategory;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  suggested_action: string | null;
  evidence: InsightEvidence[];
  affected_items: InsightAffectedItem[];
  impact_estimate: InsightImpactEstimate | null;
  confidence_score: number;
  is_homepage_related: boolean;
  is_high_value_keyword: boolean;
  data_date: string;
  generation_batch_id: string;
}

// Helper to check if URL is homepage
function isHomepage(url: string | null): boolean {
  if (!url) return false;
  return HOMEPAGE_PATTERN.test(url);
}

// Calculate linear trend coefficient (simple linear regression slope)
function calculateTrendCoefficient(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

// ============================================
// Homepage Snapshot Generation
// ============================================
export async function generateHomepageSnapshot(dataDate: string): Promise<void> {
  // Get homepage performance for the date
  const { data: homepageData } = await supabase
    .from("seo_page_performance")
    .select("*")
    .eq("date", dataDate)
    .eq("page_url", HOMEPAGE_URL)
    .single();

  // Get all keywords ranking on homepage for this date
  const { data: homepageKeywords } = await supabase
    .from("seo_keyword_rankings")
    .select("*")
    .eq("date", dataDate)
    .eq("page_url", HOMEPAGE_URL);

  if (!homepageData && !homepageKeywords?.length) {
    console.log("No homepage data for", dataDate);
    return;
  }

  // Categorize keywords by position tier
  const keywordsPageOne = homepageKeywords?.filter((k) => k.position <= 10).length || 0;
  const keywordsPageTwo = homepageKeywords?.filter((k) => k.position > 10 && k.position <= 20).length || 0;
  const keywordsPageThreePlus = homepageKeywords?.filter((k) => k.position > 20).length || 0;

  // Get rolling averages from previous data
  const { data: historicalData } = await supabase
    .from("seo_homepage_snapshots")
    .select("total_clicks")
    .lt("date", dataDate)
    .order("date", { ascending: false })
    .limit(30);

  const clicks7d = historicalData?.slice(0, 7).map((d) => d.total_clicks) || [];
  const clicks30d = historicalData?.slice(0, 30).map((d) => d.total_clicks) || [];

  const clicks7dAvg = clicks7d.length > 0 ? clicks7d.reduce((a, b) => a + b, 0) / clicks7d.length : null;
  const clicks30dAvg = clicks30d.length > 0 ? clicks30d.reduce((a, b) => a + b, 0) / clicks30d.length : null;

  // Calculate position trend from last 14 days
  const { data: positionHistory } = await supabase
    .from("seo_homepage_snapshots")
    .select("avg_position")
    .lt("date", dataDate)
    .order("date", { ascending: true })
    .limit(14);

  const positionTrend =
    positionHistory && positionHistory.length >= 3
      ? calculateTrendCoefficient(positionHistory.map((p) => p.avg_position))
      : null;

  // Upsert homepage snapshot
  const { error } = await supabase.from("seo_homepage_snapshots").upsert(
    {
      date: dataDate,
      total_clicks: homepageData?.clicks || 0,
      total_impressions: homepageData?.impressions || 0,
      avg_ctr: homepageData?.ctr || 0,
      avg_position: homepageData?.position || 0,
      keywords_page_one: keywordsPageOne,
      keywords_page_two: keywordsPageTwo,
      keywords_page_three_plus: keywordsPageThreePlus,
      total_keywords: homepageKeywords?.length || 0,
      clicks_7d_avg: clicks7dAvg,
      clicks_30d_avg: clicks30dAvg,
      position_trend: positionTrend,
    },
    { onConflict: "date" }
  );

  if (error) {
    console.error("Error creating homepage snapshot:", error);
  }
}

// ============================================
// High-Value Keywords Update
// ============================================
export async function updateHighValueKeywords(dataDate: string): Promise<void> {
  // Calculate date 28 days ago
  const date28dAgo = new Date(dataDate);
  date28dAgo.setDate(date28dAgo.getDate() - 28);
  const date28dAgoStr = date28dAgo.toISOString().split("T")[0];

  // Get aggregated keyword data for last 28 days
  const { data: keywordStats } = await supabase
    .from("seo_keyword_rankings")
    .select("query, clicks, impressions, position, page_url, date")
    .gte("date", date28dAgoStr)
    .lte("date", dataDate);

  if (!keywordStats || keywordStats.length === 0) return;

  // Aggregate by query
  const aggregated = new Map<
    string,
    {
      query: string;
      totalClicks: number;
      totalImpressions: number;
      positions: number[];
      latestPageUrl: string | null;
      latestPosition: number;
    }
  >();

  for (const row of keywordStats) {
    const existing = aggregated.get(row.query);
    if (!existing) {
      aggregated.set(row.query, {
        query: row.query,
        totalClicks: row.clicks,
        totalImpressions: row.impressions,
        positions: [row.position],
        latestPageUrl: row.page_url,
        latestPosition: row.position,
      });
    } else {
      existing.totalClicks += row.clicks;
      existing.totalImpressions += row.impressions;
      existing.positions.push(row.position);
      // Keep the most recent page URL
      if (row.date === dataDate) {
        existing.latestPageUrl = row.page_url;
        existing.latestPosition = row.position;
      }
    }
  }

  // Identify high-value keywords
  const highValueKeywords: Array<{
    query: string;
    is_brand_keyword: boolean;
    is_core_keyword: boolean;
    meets_clicks_threshold: boolean;
    meets_impressions_threshold: boolean;
    is_rising_star: boolean;
    latest_position: number;
    latest_clicks_28d: number;
    latest_impressions_28d: number;
    position_trend: number;
    ranking_page_url: string | null;
  }> = [];

  // Brand keywords (simple detection - contains brand name)
  const brandPatterns = [/domyhomework/i, /do my homework/i, /dmh/i];

  for (const [, stats] of aggregated) {
    const meetsClicksThreshold = stats.totalClicks >= HIGH_VALUE_THRESHOLDS.clicks28d;
    const meetsImpressionsThreshold = stats.totalImpressions >= HIGH_VALUE_THRESHOLDS.impressions28d;
    const positionTrend = calculateTrendCoefficient(stats.positions);
    const isRisingStar =
      positionTrend < -HIGH_VALUE_THRESHOLDS.risingStarPositionGain / 14 &&
      stats.totalClicks >= HIGH_VALUE_THRESHOLDS.risingStarMinClicks;

    // Check if this keyword should be tracked
    if (meetsClicksThreshold || meetsImpressionsThreshold || isRisingStar) {
      const isBrand = brandPatterns.some((p) => p.test(stats.query));
      const isCore = isHomepage(stats.latestPageUrl) && stats.totalClicks >= 20;

      highValueKeywords.push({
        query: stats.query,
        is_brand_keyword: isBrand,
        is_core_keyword: isCore,
        meets_clicks_threshold: meetsClicksThreshold,
        meets_impressions_threshold: meetsImpressionsThreshold,
        is_rising_star: isRisingStar,
        latest_position: stats.latestPosition,
        latest_clicks_28d: stats.totalClicks,
        latest_impressions_28d: stats.totalImpressions,
        position_trend: positionTrend,
        ranking_page_url: stats.latestPageUrl,
      });
    }
  }

  // Upsert high-value keywords
  if (highValueKeywords.length > 0) {
    const { error } = await supabase.from("seo_high_value_keywords").upsert(
      highValueKeywords.map((k) => ({
        ...k,
        last_updated_at: new Date().toISOString(),
      })),
      { onConflict: "query" }
    );

    if (error) {
      console.error("Error updating high-value keywords:", error);
    }
  }

  console.log(`Updated ${highValueKeywords.length} high-value keywords`);
}

// ============================================
// Insight Generation
// ============================================
export async function generateInsights(dataDate: string): Promise<number> {
  const batchId = crypto.randomUUID();
  const insights: InsightToCreate[] = [];

  // Get current and previous data
  const prevDate = new Date(dataDate);
  prevDate.setDate(prevDate.getDate() - 7);
  const prevDateStr = prevDate.toISOString().split("T")[0];

  const date28dAgo = new Date(dataDate);
  date28dAgo.setDate(date28dAgo.getDate() - 28);
  const date28dAgoStr = date28dAgo.toISOString().split("T")[0];

  // Fetch all necessary data
  const [
    { data: currentKeywords },
    { data: prevKeywords },
    { data: homepageSnapshot },
    { data: prevHomepageSnapshot },
    { data: highValueKeywords },
    { data: totalClicks },
  ] = await Promise.all([
    supabase.from("seo_keyword_rankings").select("*").eq("date", dataDate),
    supabase.from("seo_keyword_rankings").select("*").eq("date", prevDateStr),
    supabase.from("seo_homepage_snapshots").select("*").eq("date", dataDate).single(),
    supabase.from("seo_homepage_snapshots").select("*").eq("date", prevDateStr).single(),
    supabase.from("seo_high_value_keywords").select("*"),
    supabase.from("seo_daily_metrics").select("total_clicks").eq("date", dataDate).single(),
  ]);

  if (!currentKeywords || currentKeywords.length === 0) {
    console.log("No current keyword data for insights generation");
    return 0;
  }

  const prevKeywordsMap = new Map(prevKeywords?.map((k) => [k.query, k]) || []);
  const highValueMap = new Map(highValueKeywords?.map((k) => [k.query, k]) || []);
  const siteTotalClicks = totalClicks?.total_clicks || 1;

  // ============================================
  // 1. HOMEPAGE INSIGHTS (Priority)
  // ============================================

  // Homepage traffic anomaly
  if (homepageSnapshot && prevHomepageSnapshot) {
    const clicksChange =
      prevHomepageSnapshot.total_clicks > 0
        ? ((homepageSnapshot.total_clicks - prevHomepageSnapshot.total_clicks) / prevHomepageSnapshot.total_clicks) *
          100
        : 0;

    if (Math.abs(clicksChange) >= INSIGHT_THRESHOLDS.trafficAnomalyThresholdPercent) {
      const isPositive = clicksChange > 0;
      insights.push({
        category: isPositive ? "pattern" : "threat",
        type: "homepage_traffic_anomaly",
        priority: Math.abs(clicksChange) >= 50 ? "critical" : "high",
        title: isPositive ? "Homepage Traffic Surge" : "Homepage Traffic Drop",
        description: `Homepage ${isPositive ? "gained" : "lost"} ${Math.abs(clicksChange).toFixed(1)}% traffic compared to 7 days ago (${prevHomepageSnapshot.total_clicks} → ${homepageSnapshot.total_clicks} clicks).`,
        suggested_action: isPositive
          ? "Investigate what's driving this increase - new ranking, featured snippet, or external link?"
          : "Check for ranking drops, technical issues, or algorithm changes affecting the homepage.",
        evidence: [
          { metric: "Current Clicks", value: homepageSnapshot.total_clicks },
          { metric: "Previous Clicks", value: prevHomepageSnapshot.total_clicks },
          { metric: "Change", value: `${clicksChange.toFixed(1)}%` },
        ],
        affected_items: [{ type: "page", value: HOMEPAGE_URL }],
        impact_estimate: {
          clicks: Math.abs(homepageSnapshot.total_clicks - prevHomepageSnapshot.total_clicks),
          description: isPositive ? "Additional daily clicks" : "Lost daily clicks",
        },
        confidence_score: 0.9,
        is_homepage_related: true,
        is_high_value_keyword: false,
        data_date: dataDate,
        generation_batch_id: batchId,
      });
    }

    // Homepage keywords moved off page 1
    if (homepageSnapshot.keywords_page_one < prevHomepageSnapshot.keywords_page_one) {
      const lostCount = prevHomepageSnapshot.keywords_page_one - homepageSnapshot.keywords_page_one;
      insights.push({
        category: "threat",
        type: "homepage_keyword_drop",
        priority: lostCount >= 3 ? "critical" : "high",
        title: `${lostCount} Homepage Keywords Dropped from Page 1`,
        description: `The homepage lost ${lostCount} keywords from page 1 positions this week (${prevHomepageSnapshot.keywords_page_one} → ${homepageSnapshot.keywords_page_one}).`,
        suggested_action:
          "Review which keywords dropped and assess if content updates or link building is needed to recover.",
        evidence: [
          { metric: "Keywords on Page 1", value: homepageSnapshot.keywords_page_one },
          { metric: "Previous Week", value: prevHomepageSnapshot.keywords_page_one },
          { metric: "Lost", value: lostCount },
        ],
        affected_items: [{ type: "page", value: HOMEPAGE_URL }],
        impact_estimate: null,
        confidence_score: 0.85,
        is_homepage_related: true,
        is_high_value_keyword: false,
        data_date: dataDate,
        generation_batch_id: batchId,
      });
    }
  }

  // Homepage keyword position drops
  const homepageKeywords = currentKeywords.filter((k) => isHomepage(k.page_url));
  for (const keyword of homepageKeywords) {
    const prev = prevKeywordsMap.get(keyword.query);
    if (prev && prev.page_url === HOMEPAGE_URL) {
      const positionDrop = keyword.position - prev.position;
      if (positionDrop >= INSIGHT_THRESHOLDS.homepagePositionDropThreshold) {
        const isHighValue = highValueMap.has(keyword.query);
        insights.push({
          category: "threat",
          type: "homepage_keyword_drop",
          priority: positionDrop >= 5 ? "critical" : "high",
          title: `Homepage Keyword Drop: "${keyword.query}"`,
          description: `"${keyword.query}" dropped ${positionDrop.toFixed(1)} positions on the homepage (${prev.position.toFixed(1)} → ${keyword.position.toFixed(1)}).`,
          suggested_action: `Review the homepage content and meta tags for "${keyword.query}". Check if competitors have improved their content.`,
          evidence: [
            { metric: "Current Position", value: keyword.position.toFixed(1) },
            { metric: "Previous Position", value: prev.position.toFixed(1) },
            { metric: "Drop", value: positionDrop.toFixed(1) },
            { metric: "Impressions", value: keyword.impressions },
          ],
          affected_items: [
            { type: "keyword", value: keyword.query, url: HOMEPAGE_URL },
            { type: "page", value: HOMEPAGE_URL },
          ],
          impact_estimate: {
            clicks: keyword.clicks,
            description: "Current daily clicks at risk",
          },
          confidence_score: 0.9,
          is_homepage_related: true,
          is_high_value_keyword: isHighValue,
          data_date: dataDate,
          generation_batch_id: batchId,
        });
      }
    }
  }

  // ============================================
  // 2. HIGH-VALUE KEYWORD INSIGHTS
  // ============================================

  // Core keyword decline
  for (const [query, hvKeyword] of highValueMap) {
    const current = currentKeywords.find((k) => k.query === query);
    const prev = prevKeywordsMap.get(query);

    if (current && prev) {
      const positionDrop = current.position - prev.position;

      if (positionDrop >= INSIGHT_THRESHOLDS.coreKeywordDropThreshold) {
        insights.push({
          category: "threat",
          type: "core_keyword_decline",
          priority: hvKeyword.is_brand_keyword || hvKeyword.is_core_keyword ? "critical" : "high",
          title: `High-Value Keyword Declining: "${query}"`,
          description: `"${query}" (${hvKeyword.latest_clicks_28d} clicks/28d) dropped ${positionDrop.toFixed(1)} positions (${prev.position.toFixed(1)} → ${current.position.toFixed(1)}).`,
          suggested_action: `Prioritize recovery for "${query}". Analyze competitor content and consider content refresh or link building.`,
          evidence: [
            { metric: "28-Day Clicks", value: hvKeyword.latest_clicks_28d || 0 },
            { metric: "Current Position", value: current.position.toFixed(1) },
            { metric: "Position Drop", value: positionDrop.toFixed(1) },
            { metric: "Keyword Type", value: hvKeyword.is_brand_keyword ? "Brand" : hvKeyword.is_core_keyword ? "Core" : "Traffic" },
          ],
          affected_items: [{ type: "keyword", value: query, url: current.page_url || undefined }],
          impact_estimate: {
            clicks: hvKeyword.latest_clicks_28d || 0,
            traffic_percent: ((hvKeyword.latest_clicks_28d || 0) / siteTotalClicks) * 100,
          },
          confidence_score: 0.85,
          is_homepage_related: isHomepage(current.page_url),
          is_high_value_keyword: true,
          data_date: dataDate,
          generation_batch_id: batchId,
        });
      }
    }
  }

  // ============================================
  // 3. OPPORTUNITY INSIGHTS
  // ============================================

  // Strike distance keywords (position 11-20, high impressions)
  for (const keyword of currentKeywords) {
    if (
      keyword.position >= INSIGHT_THRESHOLDS.strikeDistanceMinPosition &&
      keyword.position <= INSIGHT_THRESHOLDS.strikeDistanceMaxPosition &&
      keyword.impressions >= INSIGHT_THRESHOLDS.strikeDistanceMinImpressions
    ) {
      const expectedCtrAtPos5 = getExpectedCtr(5);
      const potentialClicks = Math.round(keyword.impressions * expectedCtrAtPos5);

      insights.push({
        category: "opportunity",
        type: "strike_distance_keyword",
        priority: keyword.impressions >= 500 ? "high" : "medium",
        title: `Strike Distance: "${keyword.query}"`,
        description: `"${keyword.query}" is ranking at position ${keyword.position.toFixed(1)} with ${keyword.impressions} impressions. Moving to page 1 could significantly increase clicks.`,
        suggested_action: `Optimize on-page content for "${keyword.query}" and build 2-3 internal links to ${keyword.page_url || "the ranking page"}.`,
        evidence: [
          { metric: "Position", value: keyword.position.toFixed(1) },
          { metric: "Impressions", value: keyword.impressions },
          { metric: "Current Clicks", value: keyword.clicks },
          { metric: "Current CTR", value: `${(keyword.ctr * 100).toFixed(2)}%` },
        ],
        affected_items: [{ type: "keyword", value: keyword.query, url: keyword.page_url || undefined }],
        impact_estimate: {
          clicks: potentialClicks,
          description: `Potential clicks if reaching position 5 (${(expectedCtrAtPos5 * 100).toFixed(1)}% CTR)`,
        },
        confidence_score: 0.7,
        is_homepage_related: isHomepage(keyword.page_url),
        is_high_value_keyword: highValueMap.has(keyword.query),
        data_date: dataDate,
        generation_batch_id: batchId,
      });
    }
  }

  // Untapped impressions (high impressions, low CTR)
  for (const keyword of currentKeywords) {
    if (
      keyword.impressions >= INSIGHT_THRESHOLDS.untappedMinImpressions &&
      keyword.ctr <= INSIGHT_THRESHOLDS.untappedMaxCtr &&
      keyword.position <= 15
    ) {
      const expectedCtr = getExpectedCtr(keyword.position);
      const potentialClicks = Math.round(keyword.impressions * expectedCtr);

      insights.push({
        category: "opportunity",
        type: "untapped_impressions",
        priority: "high",
        title: `Untapped Potential: "${keyword.query}"`,
        description: `"${keyword.query}" has ${keyword.impressions} impressions but only ${(keyword.ctr * 100).toFixed(2)}% CTR. Expected CTR at position ${Math.round(keyword.position)} is ${(expectedCtr * 100).toFixed(1)}%.`,
        suggested_action: `Improve title tag and meta description to be more compelling for "${keyword.query}". Test different CTAs.`,
        evidence: [
          { metric: "Impressions", value: keyword.impressions },
          { metric: "Current CTR", value: `${(keyword.ctr * 100).toFixed(2)}%` },
          { metric: "Expected CTR", value: `${(expectedCtr * 100).toFixed(1)}%` },
          { metric: "Position", value: keyword.position.toFixed(1) },
        ],
        affected_items: [{ type: "keyword", value: keyword.query, url: keyword.page_url || undefined }],
        impact_estimate: {
          clicks: potentialClicks - keyword.clicks,
          description: "Additional clicks at expected CTR",
        },
        confidence_score: 0.75,
        is_homepage_related: isHomepage(keyword.page_url),
        is_high_value_keyword: highValueMap.has(keyword.query),
        data_date: dataDate,
        generation_batch_id: batchId,
      });
    }
  }

  // ============================================
  // 4. PATTERN INSIGHTS
  // ============================================

  // Traffic concentration risk
  const sortedByClicks = [...currentKeywords].sort((a, b) => b.clicks - a.clicks);
  const topKeywordsClicks = sortedByClicks
    .slice(0, INSIGHT_THRESHOLDS.concentrationRiskTopKeywords)
    .reduce((sum, k) => sum + k.clicks, 0);
  const totalKeywordClicks = currentKeywords.reduce((sum, k) => sum + k.clicks, 0);
  const concentrationPercent = totalKeywordClicks > 0 ? (topKeywordsClicks / totalKeywordClicks) * 100 : 0;

  if (concentrationPercent >= INSIGHT_THRESHOLDS.concentrationRiskThresholdPercent) {
    insights.push({
      category: "pattern",
      type: "traffic_concentration_risk",
      priority: concentrationPercent >= 60 ? "high" : "medium",
      title: "Traffic Concentration Risk",
      description: `Top ${INSIGHT_THRESHOLDS.concentrationRiskTopKeywords} keywords account for ${concentrationPercent.toFixed(1)}% of all keyword clicks. Losing any of these could significantly impact traffic.`,
      suggested_action:
        "Diversify traffic sources by optimizing for more keywords. Consider creating content targeting related long-tail keywords.",
      evidence: [
        { metric: "Top 5 Keywords Clicks", value: topKeywordsClicks },
        { metric: "Total Clicks", value: totalKeywordClicks },
        { metric: "Concentration", value: `${concentrationPercent.toFixed(1)}%` },
      ],
      affected_items: sortedByClicks.slice(0, 5).map((k) => ({
        type: "keyword" as const,
        value: k.query,
        metrics: { clicks: k.clicks, position: k.position },
      })),
      impact_estimate: null,
      confidence_score: 0.8,
      is_homepage_related: false,
      is_high_value_keyword: false,
      data_date: dataDate,
      generation_batch_id: batchId,
    });
  }

  // ============================================
  // 5. SAVE INSIGHTS
  // ============================================

  // Expire old active insights of the same types
  const typesToExpire = [...new Set(insights.map((i) => i.type))];
  if (typesToExpire.length > 0) {
    await supabase
      .from("seo_insights")
      .update({ status: "expired" })
      .eq("status", "active")
      .in("type", typesToExpire);
  }

  // Insert new insights
  if (insights.length > 0) {
    const { error } = await supabase.from("seo_insights").insert(
      insights.map((i) => ({
        ...i,
        status: "active",
      }))
    );

    if (error) {
      console.error("Error inserting insights:", error);
      return 0;
    }
  }

  console.log(`Generated ${insights.length} insights for ${dataDate}`);
  return insights.length;
}

// ============================================
// Main Entry Point
// ============================================
export async function runInsightsGeneration(dataDate?: string): Promise<{
  success: boolean;
  insightsGenerated: number;
  error?: string;
}> {
  try {
    // Get latest date if not provided
    let targetDate = dataDate;
    if (!targetDate) {
      const { data: latestData } = await supabase
        .from("seo_daily_metrics")
        .select("date")
        .order("date", { ascending: false })
        .limit(1)
        .single();

      if (!latestData) {
        return { success: false, insightsGenerated: 0, error: "No data available" };
      }
      targetDate = latestData.date;
    }

    console.log(`Generating insights for ${targetDate}`);

    // Step 1: Generate homepage snapshot
    await generateHomepageSnapshot(targetDate);

    // Step 2: Update high-value keywords
    await updateHighValueKeywords(targetDate);

    // Step 3: Generate insights
    const insightsCount = await generateInsights(targetDate);

    return { success: true, insightsGenerated: insightsCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Insights generation failed:", errorMessage);
    return { success: false, insightsGenerated: 0, error: errorMessage };
  }
}
