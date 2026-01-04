"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Target01Icon,
  Alert02Icon,
  AnalysisTextLinkIcon,
  CheckmarkBadge02Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  LinkSquare01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import type { InsightType, InsightPriority, InsightCategory } from "@/types/database";

interface InsightEvidence {
  metric: string;
  value: string | number;
  context?: string;
}

interface InsightAffectedItem {
  type: "keyword" | "page";
  identifier: string;
  url?: string;
}

interface InsightImpactEstimate {
  metric: string;
  potential_gain: number;
  unit: string;
  confidence: number;
}

interface Insight {
  id: string;
  created_at: string;
  type: InsightType;
  priority: InsightPriority;
  category: InsightCategory;
  title: string;
  description: string;
  suggested_action: string | null;
  evidence: InsightEvidence[];
  affected_items: InsightAffectedItem[];
  impact_estimate: InsightImpactEstimate | null;
  confidence_score: number;
  status: string;
}

interface InsightsListProps {
  insights: Insight[];
  onDismiss: (id: string) => void;
  onComplete: (id: string) => void;
  onViewKeyword?: (query: string, pageUrl?: string) => void;
  isLoading?: boolean;
}

const typeConfig = {
  opportunity: {
    icon: Target01Icon,
    label: "Opportunity",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    iconColor: "text-emerald-600",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  threat: {
    icon: Alert02Icon,
    label: "Threat",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-600",
    badgeColor: "bg-red-100 text-red-700",
  },
  pattern: {
    icon: AnalysisTextLinkIcon,
    label: "Pattern",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  action: {
    icon: CheckmarkBadge02Icon,
    label: "Action",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    iconColor: "text-purple-600",
    badgeColor: "bg-purple-100 text-purple-700",
  },
};

const priorityConfig = {
  critical: { label: "Critical", color: "bg-red-600 text-white" },
  high: { label: "High", color: "bg-orange-500 text-white" },
  medium: { label: "Medium", color: "bg-yellow-500 text-white" },
  low: { label: "Low", color: "bg-gray-400 text-white" },
};

export function InsightsList({
  insights,
  onDismiss,
  onComplete,
  onViewKeyword,
  isLoading,
}: InsightsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<InsightType | "all">("all");
  const [filterPriority, setFilterPriority] = useState<InsightPriority | "all">("all");

  const filteredInsights = insights.filter((insight) => {
    if (filterType !== "all" && insight.type !== filterType) return false;
    if (filterPriority !== "all" && insight.priority !== filterPriority) return false;
    return true;
  });

  // Sort by priority (critical first) then by date
  const sortedInsights = [...filteredInsights].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase">Type:</span>
          <div className="flex items-center rounded-lg bg-gray-100 p-0.5">
            {(["all", "threat", "opportunity", "pattern", "action"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                  filterType === type
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {type === "all" ? "All" : type}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase">Priority:</span>
          <div className="flex items-center rounded-lg bg-gray-100 p-0.5">
            {(["all", "critical", "high", "medium", "low"] as const).map((priority) => (
              <button
                key={priority}
                onClick={() => setFilterPriority(priority)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                  filterPriority === priority
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {priority === "all" ? "All" : priority}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto text-sm text-gray-500">
          <span className="font-medium text-gray-900">{sortedInsights.length}</span> insights
        </div>
      </div>

      {/* Insights Grid */}
      {sortedInsights.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No insights found matching your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {sortedInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              isExpanded={expandedId === insight.id}
              onToggleExpand={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
              onDismiss={() => onDismiss(insight.id)}
              onComplete={() => onComplete(insight.id)}
              onViewKeyword={onViewKeyword}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({
  insight,
  isExpanded,
  onToggleExpand,
  onDismiss,
  onComplete,
  onViewKeyword,
}: {
  insight: Insight;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDismiss: () => void;
  onComplete: () => void;
  onViewKeyword?: (query: string, pageUrl?: string) => void;
}) {
  const config = typeConfig[insight.type];
  const priorityCfg = priorityConfig[insight.priority];

  return (
    <div
      className={cn(
        "rounded-xl border-2 transition-all overflow-hidden",
        config.bgColor,
        config.borderColor
      )}
    >
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Icon */}
        <div className={cn("p-2 rounded-lg bg-white/80", config.iconColor)}>
          <HugeiconsIcon icon={config.icon} size={20} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", config.badgeColor)}>
              {config.label}
            </span>
            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", priorityCfg.color)}>
              {priorityCfg.label}
            </span>
            <span className="text-[10px] text-gray-500 ml-auto">
              {new Date(insight.created_at).toLocaleDateString()}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
            {insight.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {insight.description}
          </p>
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
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200/50 pt-4">
          {/* Evidence */}
          {insight.evidence.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Evidence
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {insight.evidence.map((ev, idx) => (
                  <div key={idx} className="bg-white/60 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500 uppercase">{ev.metric}</p>
                    <p className="text-sm font-semibold text-gray-900">{ev.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impact Estimate */}
          {insight.impact_estimate && (
            <div className="bg-white/60 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Potential Impact
              </h4>
              <p className="text-lg font-bold text-gray-900">
                +{insight.impact_estimate.potential_gain.toLocaleString()} {insight.impact_estimate.unit}
              </p>
              <p className="text-xs text-gray-500">
                {Math.round(insight.impact_estimate.confidence * 100)}% confidence
              </p>
            </div>
          )}

          {/* Suggested Action */}
          {insight.suggested_action && (
            <div className="bg-white/60 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Suggested Action
              </h4>
              <p className="text-sm text-gray-700">{insight.suggested_action}</p>
            </div>
          )}

          {/* Affected Items */}
          {insight.affected_items.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Affected {insight.affected_items[0].type === "keyword" ? "Keywords" : "Pages"}
              </h4>
              <div className="flex flex-wrap gap-2">
                {insight.affected_items.slice(0, 5).map((item, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.type === "keyword" && onViewKeyword) {
                        onViewKeyword(item.identifier, item.url);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                      "bg-white/80 text-gray-700 hover:bg-white transition-colors",
                      onViewKeyword && item.type === "keyword" && "cursor-pointer hover:text-[#FF6B35]"
                    )}
                  >
                    {item.type === "keyword" ? (
                      <span className="truncate max-w-[200px]">{item.identifier}</span>
                    ) : (
                      <span className="truncate max-w-[200px]">{item.identifier.replace(/^https?:\/\/[^/]+/, "")}</span>
                    )}
                    {onViewKeyword && item.type === "keyword" && (
                      <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
              Mark Complete
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} />
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Summary widget for overview page
export function InsightsSummary({
  counts,
  onViewAll,
}: {
  counts: {
    total: number;
    opportunity: number;
    threat: number;
    pattern: number;
    action: number;
    critical: number;
    high: number;
  };
  onViewAll: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Insights</h3>
        <button
          onClick={onViewAll}
          className="text-sm text-[#FF6B35] hover:underline font-medium"
        >
          View All
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {counts.critical > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm font-medium text-red-700">
              {counts.critical} Critical
            </span>
          </div>
        )}
        {counts.high > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-sm font-medium text-orange-700">
              {counts.high} High Priority
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50">
          <HugeiconsIcon icon={Alert02Icon} size={16} className="text-red-600" />
          <span className="text-sm text-gray-700">
            {counts.threat} Threats
          </span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50">
          <HugeiconsIcon icon={Target01Icon} size={16} className="text-emerald-600" />
          <span className="text-sm text-gray-700">
            {counts.opportunity} Opportunities
          </span>
        </div>
      </div>
    </div>
  );
}
