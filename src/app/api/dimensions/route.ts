import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

const EXCLUDED_DATES = ["2025-08-21"];

// Country code to name mapping
const COUNTRY_NAMES: Record<string, string> = {
  usa: "United States",
  ind: "India",
  gbr: "United Kingdom",
  can: "Canada",
  aus: "Australia",
  deu: "Germany",
  fra: "France",
  bra: "Brazil",
  mex: "Mexico",
  esp: "Spain",
  ita: "Italy",
  nld: "Netherlands",
  phl: "Philippines",
  pak: "Pakistan",
  bgd: "Bangladesh",
  nga: "Nigeria",
  zaf: "South Africa",
  ken: "Kenya",
  sgp: "Singapore",
  mys: "Malaysia",
};

// GET /api/dimensions - Get country/device breakdown
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { searchParams } = new URL(request.url);

    const days = parseInt(searchParams.get("days") || "28");
    const type = searchParams.get("type") || "both"; // country, device, both

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    const result: any = {};

    // Fetch country data
    if (type === "country" || type === "both") {
      const { data: countryData, error: countryError } = await supabase
        .from("seo_metrics_by_country")
        .select("country, clicks, impressions, ctr, position")
        .gte("date", startDateStr)
        .not("date", "in", `(${EXCLUDED_DATES.join(",")})`);

      if (countryError) throw countryError;

      // Aggregate by country
      const countryMap = new Map<string, { clicks: number; impressions: number; position: number; count: number }>();
      
      (countryData || []).forEach((row: any) => {
        const existing = countryMap.get(row.country);
        if (existing) {
          existing.clicks += row.clicks;
          existing.impressions += row.impressions;
          existing.position += row.position;
          existing.count += 1;
        } else {
          countryMap.set(row.country, {
            clicks: row.clicks,
            impressions: row.impressions,
            position: row.position,
            count: 1,
          });
        }
      });

      result.countries = Array.from(countryMap.entries())
        .map(([code, stats]) => ({
          code,
          name: COUNTRY_NAMES[code] || code.toUpperCase(),
          clicks: stats.clicks,
          impressions: stats.impressions,
          ctr: stats.impressions > 0 ? stats.clicks / stats.impressions : 0,
          position: stats.position / stats.count,
        }))
        .sort((a, b) => b.clicks - a.clicks);
    }

    // Fetch device data
    if (type === "device" || type === "both") {
      const { data: deviceData, error: deviceError } = await supabase
        .from("seo_metrics_by_device")
        .select("device, clicks, impressions, ctr, position")
        .gte("date", startDateStr)
        .not("date", "in", `(${EXCLUDED_DATES.join(",")})`);

      if (deviceError) throw deviceError;

      // Aggregate by device
      const deviceMap = new Map<string, { clicks: number; impressions: number; position: number; count: number }>();
      
      (deviceData || []).forEach((row: any) => {
        const existing = deviceMap.get(row.device);
        if (existing) {
          existing.clicks += row.clicks;
          existing.impressions += row.impressions;
          existing.position += row.position;
          existing.count += 1;
        } else {
          deviceMap.set(row.device, {
            clicks: row.clicks,
            impressions: row.impressions,
            position: row.position,
            count: 1,
          });
        }
      });

      result.devices = Array.from(deviceMap.entries())
        .map(([device, stats]) => ({
          device,
          label: device.charAt(0) + device.slice(1).toLowerCase(),
          clicks: stats.clicks,
          impressions: stats.impressions,
          ctr: stats.impressions > 0 ? stats.clicks / stats.impressions : 0,
          position: stats.position / stats.count,
        }))
        .sort((a, b) => b.clicks - a.clicks);
    }

    // Get available filter options
    result.availableCountries = Object.entries(COUNTRY_NAMES).map(([code, name]) => ({ code, name }));
    result.availableDevices = [
      { device: "MOBILE", label: "Mobile" },
      { device: "DESKTOP", label: "Desktop" },
      { device: "TABLET", label: "Tablet" },
    ];

    return NextResponse.json(result);
  } catch (error) {
    console.error("Dimensions API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}