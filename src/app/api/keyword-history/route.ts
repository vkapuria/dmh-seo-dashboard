import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

const EXCLUDED_DATES = ["2025-08-21"];

// GET /api/keyword-history - Get historical data for any keyword
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get("query");
    const pageUrl = searchParams.get("page_url");
    const days = parseInt(searchParams.get("days") || "90");

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    // Build query
    let dbQuery = supabase
      .from("seo_keyword_rankings")
      .select("date, position, clicks, impressions, ctr, page_url")
      .eq("query", query)
      .gte("date", startDateStr)
      .not("date", "in", `(${EXCLUDED_DATES.join(",")})`)
      .order("date", { ascending: true });

    if (pageUrl) {
      dbQuery = dbQuery.eq("page_url", pageUrl);
    }

    const { data, error } = await dbQuery;

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Keyword not found" }, { status: 404 });
    }

    // Get the most common page_url if not specified
    const detectedPageUrl = pageUrl || (data[0] as any).page_url;

    // Calculate stats
    let totalClicks = 0;
    let totalImpressions = 0;
    let positionSum = 0;

    const history = data.map((row: any) => {
      totalClicks += row.clicks;
      totalImpressions += row.impressions;
      positionSum += row.position;
      return {
        date: row.date,
        position: row.position,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
      };
    });

    const avgPosition = data.length > 0 ? positionSum / data.length : 0;
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

    return NextResponse.json({
      id: `${query}|${detectedPageUrl}`,
      query,
      page_url: detectedPageUrl,
      created_at: null,
      notes: null,
      target_position: null,
      stats: {
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: avgCtr,
        position: avgPosition,
        latestPosition: data.length > 0 ? (data[data.length - 1] as any).position : 0,
        positionChange: 0, // Would need previous period calc
        clicksChange: 0,
        impressionsChange: 0,
        dataPoints: data.length,
      },
      history,
    });
  } catch (error) {
    console.error("Keyword history API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}