import { NextRequest, NextResponse } from "next/server";
import {
  getClusterInsights,
  generateClusterInsights,
  dismissClusterInsight,
  completeClusterInsight,
} from "@/lib/cluster-insights";
import type { ClusterInsightType, InsightPriority } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clusterId = searchParams.get("clusterId") || undefined;
    const type = searchParams.get("type") as ClusterInsightType | null;
    const priority = searchParams.get("priority") as InsightPriority | null;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");

    const { insights, counts } = await getClusterInsights({
      clusterId,
      type: type || undefined,
      priority: priority || undefined,
      status,
      limit,
    });

    return NextResponse.json({
      insights,
      counts,
      total: insights.length,
    });
  } catch (error) {
    console.error("Error fetching cluster insights:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    if (action === "generate") {
      const result = await generateClusterInsights();
      return NextResponse.json({
        success: true,
        generated: result.generated,
        expired: result.expired,
        error: result.error,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use ?action=generate" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error generating cluster insights:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing insight id" },
        { status: 400 }
      );
    }

    let success = false;

    if (action === "dismiss") {
      success = await dismissClusterInsight(id);
    } else if (action === "complete") {
      success = await completeClusterInsight(id);
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
    console.error("Error updating cluster insight:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
