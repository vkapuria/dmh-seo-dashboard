import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// Dates to exclude (bad data)
const EXCLUDED_DATES = ["2025-08-21"];

interface TrackedKeyword {
  id: string;
  query: string;
  page_url: string;
  created_at: string;
  notes: string | null;
  target_position: number | null;
}

interface HistoricalDataPoint {
  date: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

// GET /api/tracked-keywords - Get all tracked keywords with current stats
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const includeHistory = searchParams.get("history") === "true";
    const specificQuery = searchParams.get("query");

    // Get tracked keywords
    let trackedQuery = supabase
      .from("seo_tracked_keywords")
      .select("*")
      .order("created_at", { ascending: false });

    if (specificQuery) {
      trackedQuery = trackedQuery.eq("query", specificQuery);
    }

    const { data: trackedKeywords, error: trackedError } = await trackedQuery;

    if (trackedError) throw trackedError;

    if (!trackedKeywords || trackedKeywords.length === 0) {
      return NextResponse.json({ tracked: [], total: 0 });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    // Get current period stats for each tracked keyword
    const trackedWithStats = await Promise.all(
      (trackedKeywords as TrackedKeyword[]).map(async (tk) => {
        // Get aggregated stats for current period
        const { data: currentData } = await supabase
          .from("seo_keyword_rankings")
          .select("date, position, clicks, impressions, ctr")
          .eq("query", tk.query)
          .eq("page_url", tk.page_url)
          .gte("date", startDateStr)
          .not("date", "in", `(${EXCLUDED_DATES.join(",")})`)
          .order("date", { ascending: true });

        // Aggregate current period
        let totalClicks = 0;
        let totalImpressions = 0;
        let positionSum = 0;
        let positionCount = 0;

        const history: HistoricalDataPoint[] = [];

        (currentData || []).forEach((row: any) => {
          totalClicks += row.clicks;
          totalImpressions += row.impressions;
          positionSum += row.position;
          positionCount += 1;

          if (includeHistory) {
            history.push({
              date: row.date,
              position: row.position,
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: row.ctr,
            });
          }
        });

        const avgPosition = positionCount > 0 ? positionSum / positionCount : 0;
        const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

        // Get previous period for comparison
        const prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        const prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevStartDate.getDate() - days);
        const prevStartStr = prevStartDate.toISOString().split("T")[0];
        const prevEndStr = prevEndDate.toISOString().split("T")[0];

        const { data: prevData } = await supabase
          .from("seo_keyword_rankings")
          .select("position, clicks, impressions")
          .eq("query", tk.query)
          .eq("page_url", tk.page_url)
          .gte("date", prevStartStr)
          .lte("date", prevEndStr)
          .not("date", "in", `(${EXCLUDED_DATES.join(",")})`);

        let prevClicks = 0;
        let prevImpressions = 0;
        let prevPositionSum = 0;
        let prevPositionCount = 0;

        (prevData || []).forEach((row: any) => {
          prevClicks += row.clicks;
          prevImpressions += row.impressions;
          prevPositionSum += row.position;
          prevPositionCount += 1;
        });

        const prevAvgPosition = prevPositionCount > 0 ? prevPositionSum / prevPositionCount : 0;

        // Get latest data point
        const latestData = currentData && currentData.length > 0 
            ? (currentData[currentData.length - 1] as { position: number })
            : null;

        return {
          ...tk,
          stats: {
            clicks: totalClicks,
            impressions: totalImpressions,
            ctr: avgCtr,
            position: avgPosition,
            latestPosition: latestData?.position || 0,
            positionChange: prevAvgPosition > 0 ? prevAvgPosition - avgPosition : 0,
            clicksChange: prevClicks > 0 ? ((totalClicks - prevClicks) / prevClicks) * 100 : 0,
            impressionsChange: prevImpressions > 0 ? ((totalImpressions - prevImpressions) / prevImpressions) * 100 : 0,
            dataPoints: positionCount,
          },
          history: includeHistory ? history : undefined,
        };
      })
    );

    return NextResponse.json({
      tracked: trackedWithStats,
      total: trackedWithStats.length,
      period: { start: startDateStr, end: endDate.toISOString().split("T")[0], days },
    });
  } catch (error) {
    console.error("Tracked Keywords API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/tracked-keywords - Add a tracked keyword
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const body = await request.json();
    const { query, page_url, notes, target_position } = body;

    if (!query || !page_url) {
      return NextResponse.json(
        { error: "query and page_url are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
    .from("seo_tracked_keywords")
    .upsert(
        { query, page_url, notes, target_position } as never,
        { onConflict: "query,page_url" }
    )
    .select()
    .single();

    if (error) throw error;

    return NextResponse.json({ success: true, tracked: data });
  } catch (error) {
    console.error("Track keyword error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/tracked-keywords - Remove a tracked keyword
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const query = searchParams.get("query");
    const page_url = searchParams.get("page_url");

    if (id) {
      const { error } = await supabase
        .from("seo_tracked_keywords")
        .delete()
        .eq("id", id);

      if (error) throw error;
    } else if (query && page_url) {
      const { error } = await supabase
        .from("seo_tracked_keywords")
        .delete()
        .eq("query", query)
        .eq("page_url", page_url);

      if (error) throw error;
    } else {
      return NextResponse.json(
        { error: "id or (query + page_url) required" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Untrack keyword error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}