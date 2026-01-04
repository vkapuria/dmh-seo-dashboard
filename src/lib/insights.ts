import { createServerSupabase, createUntypedServerSupabase } from "./supabase";
import type {
  InsightType,
  InsightPriority,
  InsightCategory,
  InsightEvidence,
  InsightAffectedItem,
  InsightImpactEstimate,
} from "@/types/database";

const supabase = createServerSupabase();
// Untyped client for insights table (not in Database type yet)
const untypedSupabase = createUntypedServerSupabase();

// Bad date to exclude from analysis
const EXCLUDED_DATE = "2025-08-21";

// Expected CTR by position (based on industry benchmarks)
const EXPECTED_CTR_BY_POSITION: Record<number, number> = {
  1: 0.28,
  2: 0.15,
  3: 0.11,
  4: 0.08,
  5: 0.065,
  6: 0.045,
  7: 0.035,
  8: 0.03,
  9: 0.025,
  10: 0.022,
};

function getExpectedCTR(position: number): number {
  if (position <= 0) return 0;
  if (position <= 10) return EXPECTED_CTR_BY_POSITION[Math.ceil(position)] || 0.02;
  if (position <= 20) return 0.01;
  return 0.005;
}

interface InsightInput {
  type: InsightType;
  priority: InsightPriority;
  category: InsightCategory;
  title: string;
  description: string;
  suggested_action: string;
  evidence: InsightEvidence[];
  affected_items: InsightAffectedItem[];
  impact_estimate?: InsightImpactEstimate;
  confidence_score?: number;
  insight_key: string;
  metadata?: Record<string, unknown>;
}

// Database record types
interface KeywordRecord {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  page_url: string | null;
  date: string;
}

interface PageRecord {
  page_url: string;
  page_type: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  date: string;
}

interface DailyMetricRecord {
  date: string;
}

interface InsightRecord {
  id: string;
  type: string;
  priority: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// ============================================
// INSIGHT GENERATORS
// ============================================

/**
 * Strike Distance Keywords (Position 11-20, high impressions)
 * Priority: High | Category: Keyword | Type: Opportunity
 */
async function generateStrikeDistanceInsights(
  latestDate: string
): Promise<InsightInput[]> {
  const insights: InsightInput[] = [];

  // Get keywords ranking 11-20 with significant impressions
  const { data } = await supabase
    .from("seo_keyword_rankings")
    .select("*")
    .eq("date", latestDate)
    .gt("position", 10)
    .lte("position", 20)
    .gt("impressions", 100)
    .order("impressions", { ascending: false })
    .limit(20);

  const keywords = data as KeywordRecord[] | null;
  if (!keywords) return insights;

  for (const kw of keywords) {
    const currentCTR = kw.ctr;
    const expectedCTRAtPosition5 = getExpectedCTR(5);
    const potentialClicks = Math.round(kw.impressions * expectedCTRAtPosition5) - kw.clicks;

    if (potentialClicks > 10) {
      insights.push({
        type: "opportunity",
        priority: kw.impressions > 500 ? "high" : "medium",
        category: "keyword",
        title: `Strike Distance: "${kw.query}"`,
        description: `This keyword is ranking at position ${kw.position.toFixed(1)} with ${kw.impressions.toLocaleString()} impressions. Moving to page 1 could generate an estimated ${potentialClicks}+ additional clicks.`,
        suggested_action: `Optimize on-page content and build internal links to ${kw.page_url || "the ranking page"}`,
        evidence: [
          { metric: "Current Position", value: kw.position.toFixed(1) },
          { metric: "Monthly Impressions", value: kw.impressions.toLocaleString() },
          { metric: "Current CTR", value: `${(currentCTR * 100).toFixed(2)}%` },
          { metric: "Expected CTR at Position 5", value: `${(expectedCTRAtPosition5 * 100).toFixed(1)}%` },
        ],
        affected_items: [
          { type: "keyword", identifier: kw.query, url: kw.page_url || undefined },
        ],
        impact_estimate: {
          metric: "clicks",
          potential_gain: potentialClicks,
          unit: "clicks/month",
          confidence: 0.7,
        },
        confidence_score: 0.85,
        insight_key: `strike_distance_${kw.query}`,
        metadata: { position: kw.position, impressions: kw.impressions },
      });
    }
  }

  return insights;
}

/**
 * CTR Optimization Needed (Low CTR for position, high impressions)
 * Priority: High | Category: Keyword | Type: Opportunity
 */
async function generateCTROptimizationInsights(
  latestDate: string
): Promise<InsightInput[]> {
  const insights: InsightInput[] = [];

  // Get keywords with potentially low CTR
  const { data } = await supabase
    .from("seo_keyword_rankings")
    .select("*")
    .eq("date", latestDate)
    .lte("position", 10)
    .gt("impressions", 500)
    .order("impressions", { ascending: false })
    .limit(50);

  const keywords = data as KeywordRecord[] | null;
  if (!keywords) return insights;

  for (const kw of keywords) {
    const expectedCTR = getExpectedCTR(Math.ceil(kw.position));
    const ctrRatio = kw.ctr / expectedCTR;

    // If CTR is less than 50% of expected
    if (ctrRatio < 0.5 && kw.impressions > 500) {
      const potentialGain = Math.round(kw.impressions * expectedCTR) - kw.clicks;

      insights.push({
        type: "opportunity",
        priority: kw.position <= 5 && kw.impressions > 1000 ? "high" : "medium",
        category: "keyword",
        title: `CTR Optimization: "${kw.query}"`,
        description: `This keyword has a CTR of ${(kw.ctr * 100).toFixed(2)}%, which is ${Math.round((1 - ctrRatio) * 100)}% below expected for position ${Math.ceil(kw.position)}. SERP features may be stealing clicks, or the title/meta needs improvement.`,
        suggested_action: "Update title tag and meta description to be more compelling. Check SERP for featured snippets competing for clicks.",
        evidence: [
          { metric: "Current Position", value: kw.position.toFixed(1) },
          { metric: "Current CTR", value: `${(kw.ctr * 100).toFixed(2)}%` },
          { metric: "Expected CTR", value: `${(expectedCTR * 100).toFixed(1)}%` },
          { metric: "Monthly Impressions", value: kw.impressions.toLocaleString() },
        ],
        affected_items: [
          { type: "keyword", identifier: kw.query, url: kw.page_url || undefined },
        ],
        impact_estimate: {
          metric: "clicks",
          potential_gain: potentialGain,
          unit: "clicks/month",
          confidence: 0.6,
        },
        confidence_score: 0.75,
        insight_key: `ctr_optimization_${kw.query}`,
        metadata: { ctr_ratio: ctrRatio },
      });
    }
  }

  return insights.slice(0, 10); // Limit to top 10
}

/**
 * Core Keyword Decline (Top keywords losing position over 2+ weeks)
 * Priority: Critical | Category: Keyword | Type: Threat
 */
async function generateCoreKeywordDeclineInsights(
  latestDate: string
): Promise<InsightInput[]> {
  const insights: InsightInput[] = [];

  const twoWeeksAgo = new Date(latestDate);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];

  const oneWeekAgo = new Date(latestDate);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = oneWeekAgo.toISOString().split("T")[0];

  // Get current top keywords by clicks
  const { data: currentData } = await supabase
    .from("seo_keyword_rankings")
    .select("*")
    .eq("date", latestDate)
    .order("clicks", { ascending: false })
    .limit(50);

  const currentKeywords = currentData as KeywordRecord[] | null;
  if (!currentKeywords) return insights;

  // Get historical data
  const { data: oneWeekData } = await supabase
    .from("seo_keyword_rankings")
    .select("query, position")
    .eq("date", oneWeekAgoStr);

  const { data: twoWeekData } = await supabase
    .from("seo_keyword_rankings")
    .select("query, position")
    .eq("date", twoWeeksAgoStr);

  const oneWeekKeywords = oneWeekData as { query: string; position: number }[] | null;
  const twoWeekKeywords = twoWeekData as { query: string; position: number }[] | null;

  const oneWeekMap = new Map((oneWeekKeywords || []).map((k) => [k.query, k.position]));
  const twoWeekMap = new Map((twoWeekKeywords || []).map((k) => [k.query, k.position]));

  for (const kw of currentKeywords) {
    const oneWeekPos = oneWeekMap.get(kw.query);
    const twoWeekPos = twoWeekMap.get(kw.query);

    if (oneWeekPos && twoWeekPos) {
      const dropFrom1Week = kw.position - oneWeekPos;
      const dropFrom2Weeks = kw.position - twoWeekPos;

      // Consistent decline over both periods
      if (dropFrom1Week > 3 && dropFrom2Weeks > 5 && kw.clicks >= 5) {
        const severity: InsightPriority =
          dropFrom2Weeks > 10 || kw.clicks > 50 ? "critical" : "high";

        insights.push({
          type: "threat",
          priority: severity,
          category: "keyword",
          title: `Position Decline: "${kw.query}"`,
          description: `This core keyword has been consistently declining for 2+ weeks. Position dropped from ${twoWeekPos.toFixed(1)} to ${kw.position.toFixed(1)} (${dropFrom2Weeks.toFixed(1)} positions lost).`,
          suggested_action: "Investigate competitors, check for content freshness issues, and review technical SEO factors.",
          evidence: [
            { metric: "Current Position", value: kw.position.toFixed(1) },
            { metric: "Position 1 Week Ago", value: oneWeekPos.toFixed(1) },
            { metric: "Position 2 Weeks Ago", value: twoWeekPos.toFixed(1) },
            { metric: "Total Drop", value: `${dropFrom2Weeks.toFixed(1)} positions` },
            { metric: "Monthly Clicks", value: kw.clicks.toLocaleString() },
          ],
          affected_items: [
            { type: "keyword", identifier: kw.query, url: kw.page_url || undefined },
          ],
          confidence_score: 0.9,
          insight_key: `core_decline_${kw.query}`,
          metadata: { drop_1w: dropFrom1Week, drop_2w: dropFrom2Weeks },
        });
      }
    }
  }

  return insights.slice(0, 10);
}

/**
 * Approaching Page 2 (Position 8-10 with downward trend)
 * Priority: Medium-High | Category: Keyword | Type: Threat
 */
async function generateApproachingPage2Insights(
  latestDate: string
): Promise<InsightInput[]> {
  const insights: InsightInput[] = [];

  const oneWeekAgo = new Date(latestDate);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = oneWeekAgo.toISOString().split("T")[0];

  // Get keywords in danger zone (position 8-10)
  const { data: currentData } = await supabase
    .from("seo_keyword_rankings")
    .select("*")
    .eq("date", latestDate)
    .gte("position", 8)
    .lte("position", 10.5)
    .gt("impressions", 200)
    .order("impressions", { ascending: false })
    .limit(30);

  const currentKeywords = currentData as KeywordRecord[] | null;
  if (!currentKeywords) return insights;

  // Get week-ago data
  const { data: weekAgoData } = await supabase
    .from("seo_keyword_rankings")
    .select("query, position")
    .eq("date", oneWeekAgoStr);

  const weekAgoKeywords = weekAgoData as { query: string; position: number }[] | null;
  const weekAgoMap = new Map((weekAgoKeywords || []).map((k) => [k.query, k.position]));

  for (const kw of currentKeywords) {
    const weekAgoPos = weekAgoMap.get(kw.query);

    if (weekAgoPos && kw.position > weekAgoPos) {
      // Downward trend
      const drop = kw.position - weekAgoPos;

      if (drop > 1) {
        insights.push({
          type: "threat",
          priority: kw.impressions > 500 ? "high" : "medium",
          category: "keyword",
          title: `Approaching Page 2: "${kw.query}"`,
          description: `This valuable keyword is at position ${kw.position.toFixed(1)} and trending downward. It dropped ${drop.toFixed(1)} positions this week and risks falling to page 2.`,
          suggested_action: "Strengthen on-page optimization and add fresh content to the ranking page.",
          evidence: [
            { metric: "Current Position", value: kw.position.toFixed(1) },
            { metric: "Position Last Week", value: weekAgoPos.toFixed(1) },
            { metric: "Weekly Drop", value: `${drop.toFixed(1)} positions` },
            { metric: "Monthly Impressions", value: kw.impressions.toLocaleString() },
          ],
          affected_items: [
            { type: "keyword", identifier: kw.query, url: kw.page_url || undefined },
          ],
          confidence_score: 0.8,
          insight_key: `approaching_page2_${kw.query}`,
          metadata: { weekly_drop: drop },
        });
      }
    }
  }

  return insights.slice(0, 5);
}

/**
 * Traffic Concentration Risk (Too dependent on few keywords)
 * Priority: High | Category: Content | Type: Pattern
 */
async function generateTrafficConcentrationInsight(
  latestDate: string
): Promise<InsightInput[]> {
  const insights: InsightInput[] = [];

  // Get all keywords with clicks
  const { data } = await supabase
    .from("seo_keyword_rankings")
    .select("query, clicks")
    .eq("date", latestDate)
    .gt("clicks", 0)
    .order("clicks", { ascending: false });

  const keywords = data as { query: string; clicks: number }[] | null;
  if (!keywords || keywords.length < 10) return insights;

  const totalClicks = keywords.reduce((sum, k) => sum + k.clicks, 0);
  const top10Clicks = keywords.slice(0, 10).reduce((sum, k) => sum + k.clicks, 0);
  const top3Clicks = keywords.slice(0, 3).reduce((sum, k) => sum + k.clicks, 0);

  const top10Percentage = (top10Clicks / totalClicks) * 100;
  const top3Percentage = (top3Clicks / totalClicks) * 100;

  if (top10Percentage > 50) {
    insights.push({
      type: "pattern",
      priority: top10Percentage > 70 ? "high" : "medium",
      category: "content",
      title: "Traffic Concentration Risk",
      description: `${top10Percentage.toFixed(0)}% of your organic traffic comes from just 10 keywords. This creates vulnerability if any of these rankings drop.`,
      suggested_action: "Diversify your content strategy to target more long-tail keywords and reduce dependency on top performers.",
      evidence: [
        { metric: "Top 10 Keywords Share", value: `${top10Percentage.toFixed(0)}%` },
        { metric: "Top 3 Keywords Share", value: `${top3Percentage.toFixed(0)}%` },
        { metric: "Total Keywords with Clicks", value: keywords.length.toLocaleString() },
        { metric: "Total Clicks", value: totalClicks.toLocaleString() },
      ],
      affected_items: keywords.slice(0, 5).map((k) => ({
        type: "keyword" as const,
        identifier: k.query,
      })),
      confidence_score: 0.95,
      insight_key: `traffic_concentration_${latestDate}`,
      metadata: { top10_percentage: top10Percentage },
    });
  }

  return insights;
}

/**
 * Cannibalization Detection (Multiple pages competing for same keyword)
 * Priority: High | Category: Keyword | Type: Threat
 */
async function generateCannibalizationInsights(
  latestDate: string
): Promise<InsightInput[]> {
  const insights: InsightInput[] = [];

  // Get all keyword-page combinations for the date range
  // We need to look at raw data before aggregation
  const thirtyDaysAgo = new Date(latestDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  // Group keywords by query to find multiple pages
  const { data } = await supabase
    .from("seo_keyword_rankings")
    .select("query, page_url, clicks, impressions, position")
    .gte("date", thirtyDaysAgoStr)
    .lte("date", latestDate)
    .neq("date", EXCLUDED_DATE)
    .gt("impressions", 50);

  const recentKeywords = data as { query: string; page_url: string | null; clicks: number; impressions: number; position: number }[] | null;
  if (!recentKeywords) return insights;

  // Group by query
  const queryGroups = new Map<string, Array<{ page_url: string; clicks: number; impressions: number; position: number }>>();

  for (const kw of recentKeywords) {
    if (!kw.page_url) continue;

    const existing = queryGroups.get(kw.query) || [];
    const pageEntry = existing.find((e) => e.page_url === kw.page_url);

    if (pageEntry) {
      pageEntry.clicks += kw.clicks;
      pageEntry.impressions += kw.impressions;
      pageEntry.position = (pageEntry.position + kw.position) / 2; // Average position
    } else {
      existing.push({
        page_url: kw.page_url,
        clicks: kw.clicks,
        impressions: kw.impressions,
        position: kw.position,
      });
    }

    queryGroups.set(kw.query, existing);
  }

  // Find keywords with multiple ranking pages
  for (const [query, pages] of queryGroups) {
    if (pages.length >= 2) {
      const totalImpressions = pages.reduce((s, p) => s + p.impressions, 0);

      // Only flag if significant impressions and both pages have traffic
      if (totalImpressions > 500 && pages.filter((p) => p.impressions > 50).length >= 2) {
        const sortedPages = pages.sort((a, b) => b.clicks - a.clicks);

        insights.push({
          type: "threat",
          priority: totalImpressions > 2000 ? "high" : "medium",
          category: "keyword",
          title: `Cannibalization: "${query}"`,
          description: `${pages.length} pages are competing for this keyword. This dilutes ranking signals and confuses search engines about which page to rank.`,
          suggested_action: "Consolidate content into one authoritative page or differentiate targeting for each page.",
          evidence: [
            { metric: "Competing Pages", value: pages.length },
            { metric: "Total Impressions", value: totalImpressions.toLocaleString() },
            { metric: "Primary Page", value: sortedPages[0].page_url },
            { metric: "Best Position", value: Math.min(...pages.map((p) => p.position)).toFixed(1) },
          ],
          affected_items: sortedPages.slice(0, 3).map((p) => ({
            type: "page" as const,
            identifier: p.page_url,
            url: p.page_url,
          })),
          confidence_score: 0.85,
          insight_key: `cannibalization_${query}`,
          metadata: { page_count: pages.length },
        });
      }
    }
  }

  return insights.slice(0, 5);
}

/**
 * Quick Win: Content Refresh Needed (Declining pages that were top performers)
 * Priority: High | Category: Content | Type: Action
 */
async function generateContentRefreshInsights(
  latestDate: string
): Promise<InsightInput[]> {
  const insights: InsightInput[] = [];

  const ninetyDaysAgo = new Date(latestDate);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split("T")[0];

  const thirtyDaysAgo = new Date(latestDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  // Get pages with declining performance
  const { data: recentData } = await supabase
    .from("seo_page_performance")
    .select("page_url, clicks, impressions")
    .gte("date", thirtyDaysAgoStr)
    .lte("date", latestDate)
    .neq("date", EXCLUDED_DATE);

  const { data: oldData } = await supabase
    .from("seo_page_performance")
    .select("page_url, clicks, impressions")
    .gte("date", ninetyDaysAgoStr)
    .lt("date", thirtyDaysAgoStr)
    .neq("date", EXCLUDED_DATE);

  const recentPages = recentData as { page_url: string; clicks: number; impressions: number }[] | null;
  const oldPages = oldData as { page_url: string; clicks: number; impressions: number }[] | null;
  if (!recentPages || !oldPages) return insights;

  // Aggregate by page
  const recentMap = new Map<string, { clicks: number; impressions: number }>();
  const oldMap = new Map<string, { clicks: number; impressions: number }>();

  for (const p of recentPages) {
    const existing = recentMap.get(p.page_url) || { clicks: 0, impressions: 0 };
    existing.clicks += p.clicks;
    existing.impressions += p.impressions;
    recentMap.set(p.page_url, existing);
  }

  for (const p of oldPages) {
    const existing = oldMap.get(p.page_url) || { clicks: 0, impressions: 0 };
    existing.clicks += p.clicks;
    existing.impressions += p.impressions;
    oldMap.set(p.page_url, existing);
  }

  // Find declining pages
  for (const [pageUrl, recent] of recentMap) {
    const old = oldMap.get(pageUrl);

    if (old && old.clicks > 20) {
      const clicksChange = (recent.clicks - old.clicks) / old.clicks;

      if (clicksChange < -0.3) { // 30%+ decline
        insights.push({
          type: "action",
          priority: old.clicks > 100 ? "high" : "medium",
          category: "content",
          title: "Content Refresh Needed",
          description: `${pageUrl} has lost ${Math.abs(Math.round(clicksChange * 100))}% of its traffic over the past 90 days. It may need updated content or improved SEO.`,
          suggested_action: "Update the content with fresh information, improve internal linking, and review keyword targeting.",
          evidence: [
            { metric: "Recent Clicks (30d)", value: recent.clicks.toLocaleString() },
            { metric: "Previous Clicks (30d)", value: old.clicks.toLocaleString() },
            { metric: "Traffic Change", value: `${Math.round(clicksChange * 100)}%` },
          ],
          affected_items: [
            { type: "page", identifier: pageUrl, url: pageUrl },
          ],
          confidence_score: 0.8,
          insight_key: `content_refresh_${pageUrl}`,
          metadata: { clicks_change: clicksChange },
        });
      }
    }
  }

  return insights.slice(0, 5);
}

/**
 * Rising Star Keywords (Position improved significantly, capitalize on momentum)
 * Priority: Medium | Category: Keyword | Type: Opportunity
 */
async function generateRisingStarInsights(
  latestDate: string
): Promise<InsightInput[]> {
  const insights: InsightInput[] = [];

  const fourWeeksAgo = new Date(latestDate);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const fourWeeksAgoStr = fourWeeksAgo.toISOString().split("T")[0];

  // Get keywords that improved significantly
  const { data: currentData } = await supabase
    .from("seo_keyword_rankings")
    .select("*")
    .eq("date", latestDate)
    .gt("impressions", 100)
    .lte("position", 30);

  const { data: oldData } = await supabase
    .from("seo_keyword_rankings")
    .select("query, position")
    .eq("date", fourWeeksAgoStr);

  const currentKeywords = currentData as KeywordRecord[] | null;
  const oldKeywords = oldData as { query: string; position: number }[] | null;
  if (!currentKeywords || !oldKeywords) return insights;

  const oldMap = new Map(oldKeywords.map((k) => [k.query, k.position]));

  for (const kw of currentKeywords) {
    const oldPosition = oldMap.get(kw.query);

    if (oldPosition && oldPosition - kw.position > 10) {
      const improvement = oldPosition - kw.position;

      insights.push({
        type: "opportunity",
        priority: kw.position <= 20 ? "medium" : "low",
        category: "keyword",
        title: `Rising Star: "${kw.query}"`,
        description: `This keyword has improved ${improvement.toFixed(0)} positions in 28 days (${oldPosition.toFixed(1)} → ${kw.position.toFixed(1)}). Capitalize on this momentum.`,
        suggested_action: "Double down with additional content, internal links, and potential link building to push into top 10.",
        evidence: [
          { metric: "Current Position", value: kw.position.toFixed(1) },
          { metric: "Position 28 Days Ago", value: oldPosition.toFixed(1) },
          { metric: "Improvement", value: `+${improvement.toFixed(0)} positions` },
          { metric: "Monthly Impressions", value: kw.impressions.toLocaleString() },
        ],
        affected_items: [
          { type: "keyword", identifier: kw.query, url: kw.page_url || undefined },
        ],
        confidence_score: 0.85,
        insight_key: `rising_star_${kw.query}`,
        metadata: { improvement },
      });
    }
  }

  return insights
    .sort((a, b) => (b.metadata?.improvement as number || 0) - (a.metadata?.improvement as number || 0))
    .slice(0, 5);
}

// ============================================
// MAIN INSIGHT GENERATION
// ============================================

export async function generateInsights(): Promise<{
  generated: number;
  expired: number;
  error?: string;
}> {
  try {
    // Get latest date in data
    const { data: latestData } = await supabase
      .from("seo_daily_metrics")
      .select("date")
      .order("date", { ascending: false })
      .limit(1)
      .single();

    const latestRecord = latestData as DailyMetricRecord | null;
    if (!latestRecord) {
      return { generated: 0, expired: 0, error: "No data available" };
    }

    const latestDate = latestRecord.date;
    console.log(`Generating insights for date: ${latestDate}`);

    // Generate all insights in parallel
    const [
      strikeDistance,
      ctrOptimization,
      coreDecline,
      approachingPage2,
      trafficConcentration,
      cannibalization,
      contentRefresh,
      risingStars,
    ] = await Promise.all([
      generateStrikeDistanceInsights(latestDate),
      generateCTROptimizationInsights(latestDate),
      generateCoreKeywordDeclineInsights(latestDate),
      generateApproachingPage2Insights(latestDate),
      generateTrafficConcentrationInsight(latestDate),
      generateCannibalizationInsights(latestDate),
      generateContentRefreshInsights(latestDate),
      generateRisingStarInsights(latestDate),
    ]);

    const allInsights = [
      ...strikeDistance,
      ...ctrOptimization,
      ...coreDecline,
      ...approachingPage2,
      ...trafficConcentration,
      ...cannibalization,
      ...contentRefresh,
      ...risingStars,
    ];

    console.log(`Generated ${allInsights.length} raw insights`);

    // Expire old insights
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: expiredInsights } = await untypedSupabase
      .from("seo_insights")
      .update({ status: "expired", expires_at: new Date().toISOString() })
      .eq("status", "active")
      .lt("created_at", sevenDaysAgo.toISOString())
      .select("id");

    const expiredCount = (expiredInsights as { id: string }[] | null)?.length || 0;

    // Upsert new insights
    let insertedCount = 0;

    for (const insight of allInsights) {
      const { error } = await untypedSupabase.from("seo_insights").upsert(
        {
          type: insight.type,
          priority: insight.priority,
          category: insight.category,
          title: insight.title,
          description: insight.description,
          suggested_action: insight.suggested_action,
          evidence: insight.evidence,
          affected_items: insight.affected_items,
          impact_estimate: insight.impact_estimate || null,
          confidence_score: insight.confidence_score || 0.8,
          status: "active",
          insight_key: insight.insight_key,
          metadata: insight.metadata || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "insight_key", ignoreDuplicates: false }
      );

      if (!error) insertedCount++;
    }

    console.log(`Inserted/updated ${insertedCount} insights, expired ${expiredCount}`);

    return { generated: insertedCount, expired: expiredCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Insight generation failed:", errorMessage);
    return { generated: 0, expired: 0, error: errorMessage };
  }
}

// ============================================
// INSIGHT MANAGEMENT
// ============================================

export async function getInsights(options: {
  type?: InsightType;
  priority?: InsightPriority;
  category?: InsightCategory;
  status?: string;
  limit?: number;
}): Promise<{ insights: any[]; counts: Record<string, number> }> {
  let query = untypedSupabase
    .from("seo_insights")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (options.type) query = query.eq("type", options.type);
  if (options.priority) query = query.eq("priority", options.priority);
  if (options.category) query = query.eq("category", options.category);
  if (options.status) query = query.eq("status", options.status);
  else query = query.eq("status", "active"); // Default to active
  if (options.limit) query = query.limit(options.limit);

  const { data: insights } = await query;

  // Get counts by type
  const { data: countData } = await untypedSupabase
    .from("seo_insights")
    .select("type, priority")
    .eq("status", "active");

  const typedCountData = countData as InsightRecord[] | null;
  const counts = {
    total: typedCountData?.length || 0,
    opportunity: typedCountData?.filter((i) => i.type === "opportunity").length || 0,
    threat: typedCountData?.filter((i) => i.type === "threat").length || 0,
    pattern: typedCountData?.filter((i) => i.type === "pattern").length || 0,
    action: typedCountData?.filter((i) => i.type === "action").length || 0,
    critical: typedCountData?.filter((i) => i.priority === "critical").length || 0,
    high: typedCountData?.filter((i) => i.priority === "high").length || 0,
  };

  return { insights: insights || [], counts };
}

export async function dismissInsight(id: string): Promise<boolean> {
  const { error } = await untypedSupabase
    .from("seo_insights")
    .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
    .eq("id", id);

  return !error;
}

export async function completeInsight(id: string): Promise<boolean> {
  const { error } = await untypedSupabase
    .from("seo_insights")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);

  return !error;
}

export async function getInsightHistory(insightId: string): Promise<any[]> {
  const { data } = await untypedSupabase
    .from("seo_insight_history")
    .select("*")
    .eq("insight_id", insightId)
    .order("created_at", { ascending: false });

  return data || [];
}
