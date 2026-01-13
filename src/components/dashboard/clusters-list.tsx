"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Folder01Icon,
  File01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Search01Icon,
  Target01Icon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import type { ClusterType, ClusterWithMetrics, ClusterMetrics } from "@/types/database";

interface ClustersListProps {
  clusters: ClusterWithMetrics[];
  onViewCluster?: (clusterId: string) => void;
  onViewKeyword?: (query: string) => void;
  isLoading?: boolean;
}

const clusterTypeConfig = {
  root_term: {
    icon: Folder01Icon,
    label: "Topic Cluster",
    color: "text-violet-400",
    bgColor: "bg-violet-500/20 border-violet-500/30",
  },
  page_based: {
    icon: File01Icon,
    label: "Page Cluster",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20 border-blue-500/30",
  },
  semantic: {
    icon: Search01Icon,
    label: "Semantic Cluster",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20 border-emerald-500/30",
  },
};

const healthConfig = {
  healthy: {
    label: "Healthy",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20 border-emerald-500/30",
    icon: CheckmarkCircle02Icon,
  },
  warning: {
    label: "Warning",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20 border-amber-500/30",
    icon: Alert02Icon,
  },
  critical: {
    label: "Critical",
    color: "text-red-400",
    bgColor: "bg-red-500/20 border-red-500/30",
    icon: Alert02Icon,
  },
};

export function ClustersList({
  clusters,
  onViewCluster,
  onViewKeyword,
  isLoading,
}: ClustersListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ClusterType | "all">("all");
  const [filterHealth, setFilterHealth] = useState<"all" | "healthy" | "warning" | "critical">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"authority" | "keywords" | "impressions">("authority");

  const filteredClusters = clusters.filter((cluster) => {
    if (filterType !== "all" && cluster.cluster_type !== filterType) return false;
    if (filterHealth !== "all" && cluster.metrics.health_status !== filterHealth) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !cluster.cluster_name.toLowerCase().includes(query) &&
        !cluster.root_term?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  // Sort clusters
  const sortedClusters = [...filteredClusters].sort((a, b) => {
    switch (sortBy) {
      case "authority":
        return b.metrics.authority_score - a.metrics.authority_score;
      case "keywords":
        return b.keyword_count - a.keyword_count;
      case "impressions":
        return b.metrics.total_impressions - a.metrics.total_impressions;
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <HugeiconsIcon
            icon={Search01Icon}
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search clusters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm focus:border-[#FF6B35] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#FF6B35]"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {(["all", "root_term", "page_based"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                filterType === type
                  ? "bg-[#FF6B35] text-white"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {type === "all" ? "All" : type === "root_term" ? "Topic" : "Page"}
            </button>
          ))}
        </div>

        {/* Health Filter */}
        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {(["all", "healthy", "warning", "critical"] as const).map((health) => (
            <button
              key={health}
              onClick={() => setFilterHealth(health)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                filterHealth === health
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {health}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm focus:border-[#FF6B35] focus:outline-none"
          >
            <option value="authority">Authority Score</option>
            <option value="keywords">Keywords</option>
            <option value="impressions">Impressions</option>
          </select>
        </div>

        <div className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{sortedClusters.length}</span> clusters
        </div>
      </div>

      {/* Clusters Grid */}
      {sortedClusters.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <HugeiconsIcon icon={Folder01Icon} size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No clusters found matching your filters.</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedClusters.map((cluster) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              isExpanded={expandedId === cluster.id}
              onToggleExpand={() => setExpandedId(expandedId === cluster.id ? null : cluster.id)}
              onViewCluster={onViewCluster}
              onViewKeyword={onViewKeyword}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClusterCard({
  cluster,
  isExpanded,
  onToggleExpand,
  onViewCluster,
  onViewKeyword,
}: {
  cluster: ClusterWithMetrics;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onViewCluster?: (clusterId: string) => void;
  onViewKeyword?: (query: string) => void;
}) {
  const typeConfig = clusterTypeConfig[cluster.cluster_type];
  const health = healthConfig[cluster.metrics.health_status];

  const positionTrendPositive = cluster.metrics.position_trend < 0; // Negative = improving (lower position is better)
  const impressionsTrendPositive = cluster.metrics.impressions_trend > 0;

  return (
    <div
      className={cn(
        "rounded-lg bg-white border border-gray-200 transition-all overflow-hidden",
        "border-l-4",
        cluster.metrics.health_status === "healthy"
          ? "border-l-emerald-500"
          : cluster.metrics.health_status === "warning"
          ? "border-l-amber-500"
          : "border-l-red-500"
      )}
    >
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggleExpand}
      >
        {/* Icon & Authority Score */}
        <div className="flex flex-col items-center gap-1">
          <div className={cn("p-2 rounded-lg", typeConfig.bgColor, "border")}>
            <HugeiconsIcon icon={typeConfig.icon} size={20} className={typeConfig.color} />
          </div>
          <AuthorityScoreBadge score={cluster.metrics.authority_score} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border", typeConfig.bgColor, typeConfig.color)}>
              {typeConfig.label}
            </span>
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border", health.bgColor, health.color)}>
              {health.label}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
            {cluster.cluster_name}
          </h3>
          {cluster.root_term && (
            <p className="text-xs text-gray-500 mt-0.5">
              Root term: <span className="font-medium">{cluster.root_term}</span>
            </p>
          )}

          {/* Quick Stats */}
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-gray-500">
              <span className="font-semibold text-gray-900">{cluster.keyword_count}</span> keywords
            </span>
            <span className="text-gray-500">
              <span className="font-semibold text-gray-900">{cluster.metrics.page_count}</span> pages
            </span>
            <span className="text-gray-500">
              <span className="font-semibold text-gray-900">{cluster.metrics.total_impressions.toLocaleString()}</span> impr
            </span>
            <span className="text-gray-500">
              Pos: <span className="font-semibold text-gray-900">{cluster.metrics.avg_position.toFixed(1)}</span>
            </span>
          </div>
        </div>

        {/* Trends */}
        <div className="flex flex-col items-end gap-1 text-xs">
          <div className={cn("flex items-center gap-1", positionTrendPositive ? "text-emerald-600" : "text-red-600")}>
            <HugeiconsIcon
              icon={positionTrendPositive ? ArrowUp01Icon : ArrowDown01Icon}
              size={14}
            />
            <span className="font-medium">
              {positionTrendPositive ? "-" : "+"}{Math.abs(cluster.metrics.position_trend).toFixed(1)} pos
            </span>
          </div>
          <div className={cn("flex items-center gap-1", impressionsTrendPositive ? "text-emerald-600" : "text-red-600")}>
            <HugeiconsIcon
              icon={impressionsTrendPositive ? ArrowUp01Icon : ArrowDown01Icon}
              size={14}
            />
            <span className="font-medium">
              {impressionsTrendPositive ? "+" : ""}{cluster.metrics.impressions_trend.toFixed(0)}% impr
            </span>
          </div>
        </div>

        {/* Expand Arrow */}
        <HugeiconsIcon
          icon={isExpanded ? ArrowUp01Icon : ArrowDown01Icon}
          size={18}
          className="text-gray-400 flex-shrink-0 mt-1"
        />
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Total Clicks" value={cluster.metrics.total_clicks.toLocaleString()} trend={cluster.metrics.clicks_trend} />
            <MetricCard label="Total Impressions" value={cluster.metrics.total_impressions.toLocaleString()} trend={cluster.metrics.impressions_trend} />
            <MetricCard label="Avg Position" value={cluster.metrics.avg_position.toFixed(1)} trend={-cluster.metrics.position_trend} invertTrend />
            <MetricCard label="Avg CTR" value={`${(cluster.metrics.avg_ctr * 100).toFixed(2)}%`} />
          </div>

          {/* Top Keywords */}
          {cluster.metrics.top_keywords.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Top Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {cluster.metrics.top_keywords.map((kw, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewKeyword?.(kw.query);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-[#FF6B35] hover:text-white transition-colors border border-gray-200"
                  >
                    <span className="truncate max-w-[150px]">{kw.query}</span>
                    <span className="text-gray-400">({kw.clicks} clicks)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Weak Keywords */}
          {cluster.metrics.weak_keywords.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
                Weak Keywords (Need Attention)
              </h4>
              <div className="space-y-2">
                {cluster.metrics.weak_keywords.map((kw, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs"
                  >
                    <span className="font-medium text-gray-800">{kw.query}</span>
                    <span className="text-amber-700">{kw.issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {onViewCluster && (
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewCluster(cluster.id);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FF6B35] text-white hover:bg-[#E55A2B] transition-colors"
              >
                <HugeiconsIcon icon={Settings01Icon} size={14} />
                View Full Details
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  trend,
  invertTrend,
}: {
  label: string;
  value: string;
  trend?: number;
  invertTrend?: boolean;
}) {
  const isPositive = invertTrend ? (trend || 0) < 0 : (trend || 0) > 0;

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
      {trend !== undefined && (
        <p className={cn("text-xs mt-1", isPositive ? "text-emerald-600" : "text-red-600")}>
          {isPositive ? "+" : ""}{trend.toFixed(1)}%
        </p>
      )}
    </div>
  );
}

export function AuthorityScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const getColor = () => {
    if (score >= 70) return "bg-emerald-500 text-white";
    if (score >= 40) return "bg-amber-500 text-white";
    return "bg-red-500 text-white";
  };

  const sizeClasses = size === "lg" ? "w-12 h-12 text-lg" : "w-8 h-8 text-xs";

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold",
        sizeClasses,
        getColor()
      )}
      title={`Authority Score: ${score}`}
    >
      {score}
    </div>
  );
}

// Summary widget for overview page
export function ClustersSummary({
  counts,
  onViewAll,
}: {
  counts: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
  };
  onViewAll: () => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Topic Health</h3>
        <button
          onClick={onViewAll}
          className="text-sm text-[#FF6B35] hover:text-[#E55A2B] font-medium transition-colors"
        >
          View All
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <span className="text-2xl font-bold text-emerald-600">{counts.healthy}</span>
          <span className="text-xs text-emerald-700">Healthy</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg bg-amber-50 border border-amber-200">
          <span className="text-2xl font-bold text-amber-600">{counts.warning}</span>
          <span className="text-xs text-amber-700">Warning</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg bg-red-50 border border-red-200">
          <span className="text-2xl font-bold text-red-600">{counts.critical}</span>
          <span className="text-xs text-red-700">Critical</span>
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 mt-3">
        {counts.total} topic clusters analyzed
      </p>
    </div>
  );
}
