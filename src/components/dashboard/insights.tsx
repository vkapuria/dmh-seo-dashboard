"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import {
  Home,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
  Target,
  Shield,
  Activity,
  ChevronRight,
  X,
  Check,
  ExternalLink,
} from "lucide-react";
import type { Insight, InsightCategory, InsightPriority } from "@/types/database";

// ============================================
// Homepage Health Widget
// ============================================

interface HomepageHealthData {
  date: string;
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
  keywords_page_one: number;
  keywords_page_two: number;
  keywords_page_three_plus: number;
  total_keywords: number;
  clicksChange: number;
  impressionsChange: number;
  positionChange: number;
  keywordsPageOneChange: number;
}

interface HomepageHealthProps {
  data: HomepageHealthData | null;
  onViewDetails?: () => void;
}

export function HomepageHealth({ data, onViewDetails }: HomepageHealthProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Home className="h-5 w-5 text-blue-600" />
            Homepage Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No homepage data available yet. Run a sync to collect data.</p>
        </CardContent>
      </Card>
    );
  }

  // Determine overall health status
  const hasIssues = data.clicksChange < -20 || data.keywordsPageOneChange < -2 || data.positionChange > 2;
  const isGood = data.clicksChange > 10 || data.keywordsPageOneChange > 0;
  const status = hasIssues ? "warning" : isGood ? "healthy" : "stable";

  const StatusIcon = status === "warning" ? AlertTriangle : status === "healthy" ? TrendingUp : Minus;
  const statusColor = status === "warning" ? "text-amber-600" : status === "healthy" ? "text-green-600" : "text-gray-500";
  const statusBg = status === "warning" ? "bg-amber-50" : status === "healthy" ? "bg-green-50" : "bg-gray-50";

  return (
    <Card className={cn("relative overflow-hidden", status === "warning" && "border-amber-200")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Home className="h-5 w-5 text-blue-600" />
            Homepage Health
          </CardTitle>
          <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium", statusBg, statusColor)}>
            <StatusIcon className="h-4 w-4" />
            {status === "warning" ? "Needs Attention" : status === "healthy" ? "Healthy" : "Stable"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-4 gap-4">
          <MetricMini
            label="Clicks"
            value={formatNumber(data.total_clicks)}
            change={data.clicksChange}
          />
          <MetricMini
            label="Impressions"
            value={formatNumber(data.total_impressions)}
            change={data.impressionsChange}
          />
          <MetricMini
            label="Avg Position"
            value={data.avg_position.toFixed(1)}
            change={-data.positionChange}
            invertDisplay
          />
          <MetricMini
            label="CTR"
            value={formatPercent(data.avg_ctr)}
          />
        </div>

        {/* Keywords Distribution */}
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium text-gray-500">Keywords Ranking: {data.total_keywords}</p>
          <div className="flex items-center gap-3">
            <KeywordTier
              label="Page 1"
              count={data.keywords_page_one}
              change={data.keywordsPageOneChange}
              color="green"
            />
            <KeywordTier
              label="Page 2"
              count={data.keywords_page_two}
              color="yellow"
            />
            <KeywordTier
              label="Page 3+"
              count={data.keywords_page_three_plus}
              color="gray"
            />
          </div>
        </div>

        {/* Warning if keywords dropped from page 1 */}
        {data.keywordsPageOneChange < 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{Math.abs(data.keywordsPageOneChange)} keywords dropped from page 1 this week</span>
          </div>
        )}

        {onViewDetails && (
          <Button variant="ghost" size="sm" className="w-full" onClick={onViewDetails}>
            View Homepage Keywords
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Mini metric display for homepage health
function MetricMini({
  label,
  value,
  change,
  invertDisplay = false,
}: {
  label: string;
  value: string;
  change?: number;
  invertDisplay?: boolean;
}) {
  const showChange = change !== undefined && change !== 0;
  const isPositive = invertDisplay ? change! < 0 : change! > 0;

  return (
    <div className="text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      {showChange && (
        <p className={cn("text-xs", isPositive ? "text-green-600" : "text-red-600")}>
          {isPositive ? "+" : ""}
          {change!.toFixed(1)}%
        </p>
      )}
    </div>
  );
}

// Keyword tier display
function KeywordTier({
  label,
  count,
  change,
  color,
}: {
  label: string;
  count: number;
  change?: number;
  color: "green" | "yellow" | "gray";
}) {
  const colors = {
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    gray: "bg-gray-200 text-gray-600",
  };

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        {change !== undefined && change !== 0 && (
          <span className={cn("text-xs font-medium", change > 0 ? "text-green-600" : "text-red-600")}>
            {change > 0 ? "+" : ""}
            {change}
          </span>
        )}
      </div>
      <div className={cn("mt-1 rounded-md px-2 py-1 text-center font-semibold", colors[color])}>
        {count}
      </div>
    </div>
  );
}

// ============================================
// Traffic Keywords Watchlist
// ============================================

interface WatchlistKeyword {
  query: string;
  latest_clicks_28d: number | null;
  latest_impressions_28d: number | null;
  latest_position: number | null;
  position_trend: number | null;
  ranking_page_url: string | null;
  is_brand_keyword: boolean;
  is_core_keyword: boolean;
}

interface TrafficWatchlistProps {
  needsAttention: WatchlistKeyword[];
  growing: WatchlistKeyword[];
  stable: WatchlistKeyword[];
  untapped: WatchlistKeyword[];
  onViewAll?: () => void;
}

export function TrafficWatchlist({
  needsAttention,
  growing,
  stable,
  untapped,
  onViewAll,
}: TrafficWatchlistProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-blue-600" />
            Traffic Keywords Watchlist
          </CardTitle>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Needs Attention */}
        {needsAttention.length > 0 && (
          <WatchlistSection
            title="Needs Attention"
            keywords={needsAttention}
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            badgeColor="red"
          />
        )}

        {/* Growing */}
        {growing.length > 0 && (
          <WatchlistSection
            title="Growing"
            keywords={growing}
            icon={<TrendingUp className="h-4 w-4 text-green-500" />}
            badgeColor="green"
          />
        )}

        {/* Untapped Potential */}
        {untapped.length > 0 && (
          <WatchlistSection
            title="Untapped Potential"
            keywords={untapped}
            icon={<Target className="h-4 w-4 text-blue-500" />}
            badgeColor="blue"
            showPotential
          />
        )}

        {/* Stable */}
        {stable.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-500">
              <Minus className="h-4 w-4" />
              Stable High-Value ({stable.length})
            </p>
            <div className="text-xs text-gray-500">
              {stable.slice(0, 3).map((kw) => (
                <span key={kw.query} className="mr-2">
                  &quot;{kw.query}&quot; - {kw.latest_clicks_28d} clicks
                </span>
              ))}
              {stable.length > 3 && <span>... +{stable.length - 3} more</span>}
            </div>
          </div>
        )}

        {needsAttention.length === 0 && growing.length === 0 && stable.length === 0 && untapped.length === 0 && (
          <p className="text-sm text-gray-500">No high-value keywords tracked yet. Run a sync to identify them.</p>
        )}
      </CardContent>
    </Card>
  );
}

function WatchlistSection({
  title,
  keywords,
  icon,
  badgeColor,
  showPotential = false,
}: {
  title: string;
  keywords: WatchlistKeyword[];
  icon: React.ReactNode;
  badgeColor: "red" | "green" | "blue";
  showPotential?: boolean;
}) {
  const colors = {
    red: "bg-red-50 border-red-100",
    green: "bg-green-50 border-green-100",
    blue: "bg-blue-50 border-blue-100",
  };

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700">
        {icon}
        {title} ({keywords.length})
      </p>
      <div className="space-y-2">
        {keywords.slice(0, 3).map((kw) => (
          <div key={kw.query} className={cn("rounded-lg border p-2", colors[badgeColor])}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-gray-900">&quot;{kw.query}&quot;</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {kw.latest_clicks_28d} clicks/28d | Pos: {kw.latest_position?.toFixed(1)}
                  {kw.position_trend !== null && (
                    <span className={cn("ml-1", kw.position_trend > 0 ? "text-red-600" : "text-green-600")}>
                      ({kw.position_trend > 0 ? "+" : ""}
                      {kw.position_trend.toFixed(2)}/day)
                    </span>
                  )}
                </p>
                {showPotential && kw.latest_impressions_28d && kw.latest_clicks_28d && (
                  <p className="mt-0.5 text-xs text-blue-600">
                    Potential: +{Math.round((kw.latest_impressions_28d * 0.06) - kw.latest_clicks_28d)} clicks if reach pos 5
                  </p>
                )}
              </div>
              {(kw.is_brand_keyword || kw.is_core_keyword) && (
                <span className="ml-2 flex-shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  {kw.is_brand_keyword ? "Brand" : "Core"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Insights List
// ============================================

interface InsightsListProps {
  insights: Insight[];
  onDismiss?: (id: string) => void;
  onResolve?: (id: string) => void;
  showFilters?: boolean;
}

const categoryIcons: Record<InsightCategory, React.ReactNode> = {
  opportunity: <Target className="h-4 w-4" />,
  threat: <Shield className="h-4 w-4" />,
  pattern: <Activity className="h-4 w-4" />,
  action: <Lightbulb className="h-4 w-4" />,
};

const categoryColors: Record<InsightCategory, string> = {
  opportunity: "text-green-600 bg-green-50",
  threat: "text-red-600 bg-red-50",
  pattern: "text-blue-600 bg-blue-50",
  action: "text-amber-600 bg-amber-50",
};

const priorityColors: Record<InsightPriority, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

export function InsightsList({ insights, onDismiss, onResolve }: InsightsListProps) {
  if (insights.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Lightbulb className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-gray-500">No active insights</p>
          <p className="text-sm text-gray-400">Insights will appear here after data is analyzed</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          onDismiss={onDismiss}
          onResolve={onResolve}
        />
      ))}
    </div>
  );
}

interface InsightCardProps {
  insight: Insight;
  onDismiss?: (id: string) => void;
  onResolve?: (id: string) => void;
}

export function InsightCard({ insight, onDismiss, onResolve }: InsightCardProps) {
  return (
    <Card className={cn("relative overflow-hidden border-l-4", priorityColors[insight.priority])}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full p-1.5", categoryColors[insight.category])}>
              {categoryIcons[insight.category]}
            </span>
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {insight.category}
              </span>
              {insight.is_homepage_related && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  <Home className="h-3 w-3" />
                  Homepage
                </span>
              )}
              {insight.is_high_value_keyword && (
                <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  High-Value
                </span>
              )}
            </div>
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", priorityColors[insight.priority])}>
            {insight.priority}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="mt-3 font-semibold text-gray-900">{insight.title}</h3>
        <p className="mt-1 text-sm text-gray-600">{insight.description}</p>

        {/* Evidence */}
        {insight.evidence && insight.evidence.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {insight.evidence.slice(0, 4).map((e, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                <span className="font-medium">{e.metric}:</span>
                {typeof e.value === "number" ? formatNumber(e.value) : e.value}
              </span>
            ))}
          </div>
        )}

        {/* Suggested Action */}
        {insight.suggested_action && (
          <div className="mt-3 rounded-md bg-blue-50 p-2">
            <p className="text-xs font-medium text-blue-700">Suggested Action:</p>
            <p className="mt-0.5 text-sm text-blue-600">{insight.suggested_action}</p>
          </div>
        )}

        {/* Impact Estimate */}
        {insight.impact_estimate && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            <span>
              Potential impact:{" "}
              {insight.impact_estimate.clicks && `+${insight.impact_estimate.clicks} clicks`}
              {insight.impact_estimate.description && ` (${insight.impact_estimate.description})`}
            </span>
          </div>
        )}

        {/* Affected Items */}
        {insight.affected_items && insight.affected_items.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {insight.affected_items.slice(0, 3).map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-500"
              >
                {item.type === "keyword" ? (
                  <>&quot;{item.value}&quot;</>
                ) : (
                  <a
                    href={item.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    {item.value.replace("https://domyhomework.co", "") || "/"}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <span className="text-xs text-gray-400">
            Generated {new Date(insight.created_at).toLocaleDateString()}
          </span>
          <div className="flex gap-2">
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
                onClick={() => onDismiss(insight.id)}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Dismiss
              </Button>
            )}
            {onResolve && (
              <Button
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-700"
                onClick={() => onResolve(insight.id)}
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Mark Resolved
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Insights Summary Widget
// ============================================

interface InsightsSummary {
  total: number;
  byCategory: Record<InsightCategory, number>;
  byPriority: Record<InsightPriority, number>;
  homepage: number;
  highValue: number;
}

interface InsightsSummaryProps {
  summary: InsightsSummary;
  onClick?: () => void;
}

export function InsightsSummaryWidget({ summary, onClick }: InsightsSummaryProps) {
  const criticalCount = summary.byPriority.critical;
  const highCount = summary.byPriority.high;

  if (summary.total === 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        criticalCount > 0
          ? "bg-red-100 text-red-700 hover:bg-red-200"
          : highCount > 0
            ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
      )}
    >
      <Lightbulb className="h-4 w-4" />
      <span>
        {summary.total} Insight{summary.total !== 1 ? "s" : ""}
        {criticalCount > 0 && ` (${criticalCount} critical)`}
      </span>
    </button>
  );
}
