import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// Types
interface AlertRecord {
  id: string;
  created_at: string;
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
}

interface SeverityCount {
  severity: "critical" | "warning" | "info";
}

// GET /api/alerts - Get alerts
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unread") === "true";
    const severity = searchParams.get("severity");
    const type = searchParams.get("type");

    let query = supabase
      .from("seo_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    if (severity) {
      query = query.eq("severity", severity);
    }

    if (type) {
      query = query.eq("type", type);
    }

    const { data: alerts, error } = await query;

    if (error) throw error;

    // Get counts by severity
    const { data: severityCounts } = await supabase
      .from("seo_alerts")
      .select("severity")
      .eq("is_read", false);

    const counts = {
      critical: 0,
      warning: 0,
      info: 0,
      total: 0,
    };

    for (const alert of (severityCounts as SeverityCount[]) || []) {
      const sev = alert.severity;
      if (sev === "critical" || sev === "warning" || sev === "info") {
        counts[sev]++;
        counts.total++;
      }
    }

    return NextResponse.json({
      alerts,
      unreadCounts: counts,
    });
  } catch (error) {
    console.error("Alerts API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH /api/alerts - Mark alerts as read
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const body = await request.json();
    const { ids, markAllRead } = body;

    if (markAllRead) {
      const { error } = await supabase
        .from("seo_alerts")
        .update({ is_read: true } as never)
        .eq("is_read", false);

      if (error) throw error;
      return NextResponse.json({ success: true, message: "All alerts marked as read" });
    }

    if (ids && Array.isArray(ids)) {
      const { error } = await supabase
        .from("seo_alerts")
        .update({ is_read: true } as never)
        .in("id", ids);

      if (error) throw error;
      return NextResponse.json({ success: true, message: `${ids.length} alerts marked as read` });
    }

    return NextResponse.json({ error: "No ids or markAllRead provided" }, { status: 400 });
  } catch (error) {
    console.error("Alerts PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}