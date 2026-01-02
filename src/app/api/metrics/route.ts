import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// Dates to exclude (bad data)
const EXCLUDED_DATES = ["2025-08-21"];

// Type for daily metrics
interface DailyMetric {
  date: string;
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
}

// GET /api/metrics - Get dashboard metrics
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    // Get daily metrics for trend chart (excluding bad dates)
    const { data: dailyMetrics, error: dailyError } = await supabase
      .from("seo_daily_metrics")
      .select("*")
      .gte("date", startDateStr)
      .not("date", "in", `(${EXCLUDED_DATES.join(",")})`)
      .order("date", { ascending: true }) as { data: DailyMetric[] | null; error: any };

    if (dailyError) throw dailyError;

    // Get latest totals (excluding bad dates)
    const { data: latestMetrics, error: latestError } = await supabase
      .from("seo_daily_metrics")
      .select("*")
      .not("date", "in", `(${EXCLUDED_DATES.join(",")})`)
      .order("date", { ascending: false })
      .limit(1)
      .single() as { data: DailyMetric | null; error: any };

    // Get comparison (7 days ago, excluding bad dates)
    const compDate = new Date();
    compDate.setDate(compDate.getDate() - 9); // Account for GSC delay
    const compDateStr = compDate.toISOString().split("T")[0];

    const { data: previousMetrics } = await supabase
      .from("seo_daily_metrics")
      .select("*")
      .eq("date", compDateStr)
      .not("date", "in", `(${EXCLUDED_DATES.join(",")})`)
      .single() as { data: DailyMetric | null };

    // Calculate aggregated metrics for the period
    const totalClicks = dailyMetrics?.reduce((sum: number, d: DailyMetric) => sum + d.total_clicks, 0) || 0;
    const totalImpressions = dailyMetrics?.reduce((sum: number, d: DailyMetric) => sum + d.total_impressions, 0) || 0;
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgPosition =
      dailyMetrics && dailyMetrics.length > 0
        ? dailyMetrics.reduce((sum: number, d: DailyMetric) => sum + Number(d.avg_position), 0) / dailyMetrics.length
        : 0;

    // Calculate previous period for comparison (excluding bad dates)
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    const prevStartDateStr = prevStartDate.toISOString().split("T")[0];

    const { data: prevDailyMetrics } = await supabase
      .from("seo_daily_metrics")
      .select("*")
      .gte("date", prevStartDateStr)
      .lt("date", startDateStr)
      .not("date", "in", `(${EXCLUDED_DATES.join(",")})`) as { data: DailyMetric[] | null };

    const prevTotalClicks = prevDailyMetrics?.reduce((sum: number, d: DailyMetric) => sum + d.total_clicks, 0) || 0;
    const prevTotalImpressions =
      prevDailyMetrics?.reduce((sum: number, d: DailyMetric) => sum + d.total_impressions, 0) || 0;
    const prevAvgCtr = prevTotalImpressions > 0 ? prevTotalClicks / prevTotalImpressions : 0;
    const prevAvgPosition =
      prevDailyMetrics && prevDailyMetrics.length > 0
        ? prevDailyMetrics.reduce((sum: number, d: DailyMetric) => sum + Number(d.avg_position), 0) /
          prevDailyMetrics.length
        : 0;

    return NextResponse.json({
      summary: {
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: avgCtr,
        position: avgPosition,
        clicksChange: prevTotalClicks > 0 ? ((totalClicks - prevTotalClicks) / prevTotalClicks) * 100 : 0,
        impressionsChange:
          prevTotalImpressions > 0
            ? ((totalImpressions - prevTotalImpressions) / prevTotalImpressions) * 100
            : 0,
        ctrChange: prevAvgCtr > 0 ? ((avgCtr - prevAvgCtr) / prevAvgCtr) * 100 : 0,
        positionChange: prevAvgPosition > 0 ? prevAvgPosition - avgPosition : 0,
      },
      daily: dailyMetrics || [],
      latest: latestMetrics,
      previous: previousMetrics,
    });
  } catch (error) {
    console.error("Metrics API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}