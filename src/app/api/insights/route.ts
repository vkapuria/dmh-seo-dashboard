import { NextRequest, NextResponse } from "next/server";
import {
  getInsights,
  dismissInsight,
  completeInsight,
  generateInsights,
} from "@/lib/insights";
import type { InsightType, InsightPriority, InsightCategory } from "@/types/database";

// GET /api/insights - Fetch insights with optional filters
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const type = searchParams.get("type") as InsightType | null;
  const priority = searchParams.get("priority") as InsightPriority | null;
  const category = searchParams.get("category") as InsightCategory | null;
  const status = searchParams.get("status") || undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!)
    : 50;

  try {
    const { insights, counts } = await getInsights({
      type: type || undefined,
      priority: priority || undefined,
      category: category || undefined,
      status,
      limit,
    });

    return NextResponse.json({
      insights,
      counts,
      total: insights.length,
    });
  } catch (error) {
    console.error("Error fetching insights:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}

// POST /api/insights - Generate new insights or trigger action
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  try {
    if (action === "generate") {
      // Manually trigger insight generation
      const result = await generateInsights();
      return NextResponse.json({
        success: !result.error,
        generated: result.generated,
        expired: result.expired,
        error: result.error,
      });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in insights action:", error);
    return NextResponse.json(
      { error: "Action failed" },
      { status: 500 }
    );
  }
}

// PATCH /api/insights - Update insight status (dismiss/complete)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Insight ID required" },
        { status: 400 }
      );
    }

    let success = false;

    if (action === "dismiss") {
      success = await dismissInsight(id);
    } else if (action === "complete") {
      success = await completeInsight(id);
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'dismiss' or 'complete'" },
        { status: 400 }
      );
    }

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Failed to update insight" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating insight:", error);
    return NextResponse.json(
      { error: "Failed to update insight" },
      { status: 500 }
    );
  }
}
