"use client";

import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Add01Icon,
  Target01Icon,
  Idea01Icon,
  Link01Icon,
} from "@hugeicons/core-free-icons";
import type { InsightPriority } from "@/types/database";

interface ContentGap {
  keyword: string;
  reasoning: string;
  priority: InsightPriority;
  relatedKeywords?: string[];
  estimatedImpressions?: number;
}

interface ContentGapsListProps {
  gaps: ContentGap[];
  clusterName?: string;
  onCreateContent?: (keyword: string) => void;
  isLoading?: boolean;
}

const priorityConfig = {
  critical: { label: "Critical", color: "bg-red-100 text-red-700 border-red-200" },
  high: { label: "High", color: "bg-orange-100 text-orange-700 border-orange-200" },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-700 border-blue-200" },
  low: { label: "Low", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

export function ContentGapsList({
  gaps,
  clusterName,
  onCreateContent,
  isLoading,
}: ContentGapsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B35]" />
      </div>
    );
  }

  if (gaps.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <HugeiconsIcon icon={Target01Icon} size={32} className="mx-auto text-emerald-400 mb-3" />
        <p className="text-gray-900 font-medium">No content gaps found!</p>
        <p className="text-sm text-gray-500 mt-1">
          {clusterName
            ? `"${clusterName}" has excellent keyword coverage.`
            : "Your clusters have excellent keyword coverage."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Idea01Icon} size={20} className="text-amber-500" />
          <h3 className="font-semibold text-gray-900">
            Content Gap Opportunities
          </h3>
        </div>
        <span className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{gaps.length}</span> gaps found
        </span>
      </div>

      {/* Gaps List */}
      <div className="space-y-3">
        {gaps.map((gap, idx) => (
          <ContentGapCard
            key={idx}
            gap={gap}
            onCreateContent={onCreateContent}
          />
        ))}
      </div>
    </div>
  );
}

function ContentGapCard({
  gap,
  onCreateContent,
}: {
  gap: ContentGap;
  onCreateContent?: (keyword: string) => void;
}) {
  const priority = priorityConfig[gap.priority];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
          <HugeiconsIcon icon={Search01Icon} size={18} className="text-amber-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 text-sm">
              &ldquo;{gap.keyword}&rdquo;
            </h4>
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border", priority.color)}>
              {priority.label}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-2">
            {gap.reasoning}
          </p>

          {/* Related Keywords */}
          {gap.relatedKeywords && gap.relatedKeywords.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <HugeiconsIcon icon={Link01Icon} size={12} />
              <span>Related:</span>
              <span className="text-gray-700">
                {gap.relatedKeywords.slice(0, 3).join(", ")}
                {gap.relatedKeywords.length > 3 && ` +${gap.relatedKeywords.length - 3} more`}
              </span>
            </div>
          )}

          {/* Estimated Impressions */}
          {gap.estimatedImpressions && (
            <p className="text-xs text-emerald-600">
              Est. {gap.estimatedImpressions.toLocaleString()} monthly impressions
            </p>
          )}
        </div>

        {/* Action */}
        {onCreateContent && (
          <button
            onClick={() => onCreateContent(gap.keyword)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FF6B35] text-white hover:bg-[#E55A2B] transition-colors flex-shrink-0"
          >
            <HugeiconsIcon icon={Add01Icon} size={14} />
            Add to Plan
          </button>
        )}
      </div>
    </div>
  );
}

// Compact version for embedding in cluster cards
export function ContentGapsCompact({
  gaps,
  maxItems = 3,
}: {
  gaps: ContentGap[];
  maxItems?: number;
}) {
  if (gaps.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
        <HugeiconsIcon icon={Idea01Icon} size={12} />
        Content Gaps
      </h4>
      <div className="space-y-1">
        {gaps.slice(0, maxItems).map((gap, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs"
          >
            <span className="font-medium text-gray-800">&ldquo;{gap.keyword}&rdquo;</span>
            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium border", priorityConfig[gap.priority].color)}>
              {gap.priority}
            </span>
          </div>
        ))}
        {gaps.length > maxItems && (
          <p className="text-xs text-gray-500 text-center py-1">
            +{gaps.length - maxItems} more gaps
          </p>
        )}
      </div>
    </div>
  );
}

// Topic Coverage Chart (visual representation)
export function TopicCoverageChart({
  coverage,
  potential,
  label,
}: {
  coverage: number; // 0-100
  potential: number; // 0-100
  label: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">{coverage}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full flex">
          {/* Current coverage */}
          <div
            className="bg-[#FF6B35] transition-all duration-500"
            style={{ width: `${coverage}%` }}
          />
          {/* Potential (gap) */}
          <div
            className="bg-amber-200 transition-all duration-500"
            style={{ width: `${Math.min(potential - coverage, 100 - coverage)}%` }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#FF6B35]" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-200" />
          <span>Opportunity</span>
        </div>
      </div>
    </div>
  );
}
