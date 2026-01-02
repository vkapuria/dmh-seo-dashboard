import { NextRequest, NextResponse } from "next/server";
import { runDailySync, runBackfill } from "@/lib/sync";

// POST /api/sync - Trigger manual sync
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "daily";

    if (mode === "backfill") {
      const result = await runBackfill();
      return NextResponse.json(result);
    }

    const result = await runDailySync();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET /api/sync - Get sync status
export async function GET() {
  try {
    const { createServerSupabase } = await import("@/lib/supabase");
    const supabase = createServerSupabase();

    const { data: latestSync, error } = await supabase
      .from("seo_sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    return NextResponse.json({ syncs: latestSync });
  } catch (error) {
    console.error("Get sync status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
