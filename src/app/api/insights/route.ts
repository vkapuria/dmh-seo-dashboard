import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { runInsightsGeneration } from "@/lib/insights";
import type { InsightCategory, InsightPriority, InsightStatus } from "@/types/database";

// GET /api/insights - Get insights with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "50");
    const category = searchParams.get("category") as InsightCategory | null;
    const priority = searchParams.get("priority") as InsightPriority | null;
    const status = searchParams.get("status") as InsightStatus | null;
    const homepageOnly = searchParams.get("homepage") === "true";
    const highValueOnly = searchParams.get("highValue") === "true";

    // Build query
    let query = supabase
      .from("seo_insights")
      .select("*")
      .order("priority", { ascending: true }) // critical first
      .order("created_at", { ascending: false })
      .limit(limit);

    // Default to active insights
    if (status) {
      query = query.eq("status", status);
    } else {
      query = query.eq("status", "active");
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    if (homepageOnly) {
      query = query.eq("is_homepage_related", true);
    }

    if (highValueOnly) {
      query = query.eq("is_high_value_keyword", true);
    }

    const { data: insights, error } = await query;

    if (error) throw error;

    // Get summary counts
    const { data: summaryData } = await supabase
      .from("seo_insights")
      .select("category, priority, is_homepage_related, is_high_value_keyword")
      .eq("status", "active");

    const summary = {
      total: 0,
      byCategory: {
        opportunity: 0,
        threat: 0,
        pattern: 0,
        action: 0,
      },
      byPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      homepage: 0,
      highValue: 0,
    };

    for (const insight of summaryData || []) {
      summary.total++;
      if (insight.category in summary.byCategory) {
        summary.byCategory[insight.category as keyof typeof summary.byCategory]++;
      }
      if (insight.priority in summary.byPriority) {
        summary.byPriority[insight.priority as keyof typeof summary.byPriority]++;
      }
      if (insight.is_homepage_related) summary.homepage++;
      if (insight.is_high_value_keyword) summary.highValue++;
    }

    // Get homepage health data
    const { data: homepageHealth } = await supabase
      .from("seo_homepage_snapshots")
      .select("*")
      .order("date", { ascending: false })
      .limit(2);

    let homepage = null;
    if (homepageHealth && homepageHealth.length > 0) {
      const current = homepageHealth[0];
      const prev = homepageHealth.length > 1 ? homepageHealth[1] : null;

      homepage = {
        ...current,
        clicksChange: prev ? ((current.total_clicks - prev.total_clicks) / (prev.total_clicks || 1)) * 100 : 0,
        impressionsChange: prev ? ((current.total_impressions - prev.total_impressions) / (prev.total_impressions || 1)) * 100 : 0,
        positionChange: prev ? current.avg_position - prev.avg_position : 0,
        keywordsPageOneChange: prev ? current.keywords_page_one - prev.keywords_page_one : 0,
      };
    }

    // Get high-value keywords at risk
    const { data: keywordsAtRisk } = await supabase
      .from("seo_high_value_keywords")
      .select("*")
      .gt("position_trend", 0) // Position getting worse (higher number = worse)
      .lte("latest_position", 20)
      .order("is_brand_keyword", { ascending: false })
      .order("is_core_keyword", { ascending: false })
      .order("latest_clicks_28d", { ascending: false })
      .limit(10);

    // Get traffic keywords watchlist
    const { data: trafficKeywords } = await supabase
      .from("seo_high_value_keywords")
      .select("*")
      .order("latest_clicks_28d", { ascending: false })
      .limit(20);

    // Categorize traffic keywords
    const watchlist = {
      needsAttention: [] as typeof trafficKeywords,
      growing: [] as typeof trafficKeywords,
      stable: [] as typeof trafficKeywords,
      untapped: [] as typeof trafficKeywords,
    };

    for (const kw of trafficKeywords || []) {
      if (kw.position_trend > 0.5) {
        // Position declining significantly
        watchlist.needsAttention.push(kw);
      } else if (kw.position_trend < -0.5) {
        // Position improving
        watchlist.growing.push(kw);
      } else if (kw.latest_impressions_28d && kw.latest_clicks_28d &&
        kw.latest_impressions_28d > 1000 &&
        (kw.latest_clicks_28d / kw.latest_impressions_28d) < 0.02) {
        // High impressions, low CTR
        watchlist.untapped.push(kw);
      } else {
        watchlist.stable.push(kw);
      }
    }

    return NextResponse.json({
      insights,
      summary,
      homepage,
      keywordsAtRisk,
      watchlist,
    });
  } catch (error) {
    console.error("Insights API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/insights - Generate insights manually
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;

    const result = await runInsightsGeneration(date);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      insightsGenerated: result.insightsGenerated,
    });
  } catch (error) {
    console.error("Insights generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH /api/insights - Update insight status (dismiss, resolve)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const body = await request.json();
    const { id, ids, action } = body;

    if (!action || !["dismiss", "resolve", "reactivate"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'dismiss', 'resolve', or 'reactivate'" },
        { status: 400 }
      );
    }

    const updateData: { status: InsightStatus; dismissed_at?: string; resolved_at?: string } = {
      status: action === "dismiss" ? "dismissed" : action === "resolve" ? "resolved" : "active",
    };

    if (action === "dismiss") {
      updateData.dismissed_at = new Date().toISOString();
    } else if (action === "resolve") {
      updateData.resolved_at = new Date().toISOString();
    }

    if (ids && Array.isArray(ids)) {
      const { error } = await supabase
        .from("seo_insights")
        .update(updateData)
        .in("id", ids);

      if (error) throw error;
      return NextResponse.json({ success: true, message: `${ids.length} insights updated` });
    }

    if (id) {
      const { error } = await supabase
        .from("seo_insights")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: "Insight updated" });
    }

    return NextResponse.json({ error: "No id or ids provided" }, { status: 400 });
  } catch (error) {
    console.error("Insights PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
