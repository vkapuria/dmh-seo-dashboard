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
    iconColor: "text-emerald-400",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    accentColor: "border-l-emerald-500",
  },
  threat: {
    icon: Alert02Icon,
    label: "Threat",
    iconColor: "text-red-400",
    badgeColor: "bg-red-500/20 text-red-400 border border-red-500/30",
    accentColor: "border-l-red-500",
  },
  pattern: {
    icon: AnalysisTextLinkIcon,
    label: "Pattern",
    iconColor: "text-blue-400",
    badgeColor: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    accentColor: "border-l-blue-500",
  },
  action: {
    icon: CheckmarkBadge02Icon,
    label: "Action",
    iconColor: "text-amber-400",
    badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    accentColor: "border-l-amber-500",
  },
};

const priorityConfig = {
  critical: { label: "Critical", color: "bg-red-600 text-white" },
  high: { label: "High", color: "bg-orange-600 text-white" },
  medium: { label: "Medium", color: "bg-slate-600 text-slate-200" },
  low: { label: "Low", color: "bg-slate-700 text-slate-300" },
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Type:</span>
          <div className="flex items-center rounded-lg bg-slate-900/50 p-0.5">
            {(["all", "threat", "opportunity", "pattern", "action"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                  filterType === type
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {type === "all" ? "All" : type}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Priority:</span>
          <div className="flex items-center rounded-lg bg-slate-900/50 p-0.5">
            {(["all", "critical", "high", "medium", "low"] as const).map((priority) => (
              <button
                key={priority}
                onClick={() => setFilterPriority(priority)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                  filterPriority === priority
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {priority === "all" ? "All" : priority}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto text-sm text-slate-400">
          <span className="font-medium text-white">{sortedInsights.length}</span> insights
        </div>
      </div>

      {/* Insights Grid */}
      {sortedInsights.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <p className="text-slate-400">No insights found matching your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
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

  // Separate evidence into categories for better display
  const clicksEvidence = insight.evidence.filter(e =>
    e.metric.toLowerCase().includes('click') && !e.metric.toLowerCase().includes('change')
  );
  const impressionsEvidence = insight.evidence.filter(e =>
    e.metric.toLowerCase().includes('impression') && !e.metric.toLowerCase().includes('change')
  );
  const changeEvidence = insight.evidence.filter(e =>
    e.metric.toLowerCase().includes('change')
  );
  const otherEvidence = insight.evidence.filter(e =>
    !e.metric.toLowerCase().includes('click') &&
    !e.metric.toLowerCase().includes('impression')
  );

  return (
    <div
      className={cn(
        "rounded-lg bg-slate-800/80 border border-slate-700/50 transition-all overflow-hidden",
        "border-l-4",
        config.accentColor
      )}
    >
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
        onClick={onToggleExpand}
      >
        {/* Icon */}
        <div className={cn("p-2 rounded-lg bg-slate-900/50", config.iconColor)}>
          <HugeiconsIcon icon={config.icon} size={20} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded", config.badgeColor)}>
              {config.label}
            </span>
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded", priorityCfg.color)}>
              {priorityCfg.label}
            </span>
            <span className="text-[10px] text-slate-500 ml-auto">
              {new Date(insight.created_at).toLocaleDateString()}
            </span>
          </div>
          <h3 className="font-semibold text-white text-sm leading-tight">
            {insight.title}
          </h3>
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
            {insight.description}
          </p>
        </div>

        {/* Expand Arrow */}
        <HugeiconsIcon
          icon={isExpanded ? ArrowUp01Icon : ArrowDown01Icon}
          size={18}
          className="text-slate-500 flex-shrink-0 mt-1"
        />
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700/50 pt-4">
          {/* Evidence - Structured Layout */}
          {insight.evidence.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Evidence
              </h4>

              {/* Clicks Row */}
              {clicksEvidence.length > 0 && (
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-medium">Clicks</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {clicksEvidence.map((ev, idx) => (
                      <div key={idx}>
                        <p className="text-[10px] text-slate-500">{ev.metric}</p>
                        <p className="text-sm font-semibold text-white">{ev.value}</p>
                      </div>
                    ))}
                    {changeEvidence.filter(e => e.metric.toLowerCase().includes('click')).map((ev, idx) => (
                      <div key={`change-${idx}`}>
                        <p className="text-[10px] text-slate-500">{ev.metric}</p>
                        <p className={cn(
                          "text-sm font-semibold",
                          String(ev.value).includes('-') ? "text-red-400" : "text-emerald-400"
                        )}>{ev.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Impressions Row */}
              {impressionsEvidence.length > 0 && (
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-medium">Impressions</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {impressionsEvidence.map((ev, idx) => (
                      <div key={idx}>
                        <p className="text-[10px] text-slate-500">{ev.metric}</p>
                        <p className="text-sm font-semibold text-white">{ev.value}</p>
                      </div>
                    ))}
                    {changeEvidence.filter(e => e.metric.toLowerCase().includes('impression')).map((ev, idx) => (
                      <div key={`change-${idx}`}>
                        <p className="text-[10px] text-slate-500">{ev.metric}</p>
                        <p className={cn(
                          "text-sm font-semibold",
                          String(ev.value).includes('-') ? "text-red-400" : "text-emerald-400"
                        )}>{ev.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other metrics (Position, Keywords, etc.) */}
              {otherEvidence.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {otherEvidence.map((ev, idx) => (
                    <div key={idx} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                      <p className="text-[10px] text-slate-500 uppercase">{ev.metric}</p>
                      <p className={cn(
                        "text-sm font-semibold",
                        String(ev.value).includes('-') && !ev.metric.toLowerCase().includes('position')
                          ? "text-red-400"
                          : String(ev.value).includes('+')
                            ? "text-emerald-400"
                            : "text-white"
                      )}>{ev.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Fallback for other insights without structured evidence */}
              {clicksEvidence.length === 0 && impressionsEvidence.length === 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {insight.evidence.map((ev, idx) => (
                    <div key={idx} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                      <p className="text-[10px] text-slate-500 uppercase">{ev.metric}</p>
                      <p className={cn(
                        "text-sm font-semibold",
                        String(ev.value).includes('-') ? "text-red-400" :
                        String(ev.value).includes('+') ? "text-emerald-400" : "text-white"
                      )}>{ev.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Impact Estimate */}
          {insight.impact_estimate && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                Potential Impact
              </h4>
              <p className="text-lg font-bold text-emerald-400">
                +{insight.impact_estimate.potential_gain.toLocaleString()} {insight.impact_estimate.unit}
              </p>
              <p className="text-xs text-slate-500">
                {Math.round(insight.impact_estimate.confidence * 100)}% confidence
              </p>
            </div>
          )}

          {/* Suggested Action */}
          {insight.suggested_action && (
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Suggested Action
              </h4>
              <p className="text-sm text-slate-300">{insight.suggested_action}</p>
            </div>
          )}

          {/* Affected Items */}
          {insight.affected_items.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
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
                      "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors border border-slate-600/50",
                      onViewKeyword && item.type === "keyword" && "cursor-pointer hover:text-emerald-400 hover:border-emerald-500/30"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
              Mark Complete
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
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
    <div className="bg-slate-800/80 rounded-lg border border-slate-700/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Insights</h3>
        <button
          onClick={onViewAll}
          className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          View All
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {counts.critical > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm font-medium text-red-400">
              {counts.critical} Critical
            </span>
          </div>
        )}
        {counts.high > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-sm font-medium text-orange-400">
              {counts.high} High Priority
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <HugeiconsIcon icon={Alert02Icon} size={16} className="text-red-400" />
          <span className="text-sm text-slate-300">
            {counts.threat} Threats
          </span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <HugeiconsIcon icon={Target01Icon} size={16} className="text-emerald-400" />
          <span className="text-sm text-slate-300">
            {counts.opportunity} Opportunities
          </span>
        </div>
      </div>
    </div>
  );
}
