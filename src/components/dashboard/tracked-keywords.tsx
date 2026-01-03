"use client";

import { cn, formatNumber, formatPosition } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  StarIcon,
  TradeUpIcon,
  TradeDownIcon,
  MinusSignIcon,
  Delete02Icon,
  ChartLineData02Icon,
} from "@hugeicons/core-free-icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

interface TrackedKeywordStats {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  latestPosition: number;
  positionChange: number;
  clicksChange: number;
  impressionsChange: number;
  dataPoints: number;
}

interface HistoryPoint {
  date: string;
  position: number;
  clicks: number;
  impressions: number;
}

interface TrackedKeywordItem {
  id: string;
  query: string;
  page_url: string;
  created_at: string;
  notes: string | null;
  target_position: number | null;
  stats: TrackedKeywordStats;
  history?: HistoryPoint[];
}

interface TrackedKeywordsProps {
  keywords: TrackedKeywordItem[];
  onUntrack: (id: string) => void;
  onViewDetails: (keyword: TrackedKeywordItem) => void;
  isLoading?: boolean;
}

// Mini sparkline component
function PositionSparkline({ data }: { data: HistoryPoint[] }) {
  if (!data || data.length < 2) return <span className="text-gray-400 text-xs">No data</span>;

  return (
    <div className="w-24 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="position"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
          />
          <YAxis domain={["auto", "auto"]} hide reversed />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrackedKeywordsTable({
  keywords,
  onUntrack,
  onViewDetails,
  isLoading,
}: TrackedKeywordsProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <div className="animate-pulse text-gray-400">Loading tracked keywords...</div>
      </div>
    );
  }

  if (keywords.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <HugeiconsIcon icon={StarIcon} size={32} className="mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-600">No tracked keywords yet</p>
        <p className="mt-1 text-xs text-gray-400">
          Star keywords from the Keywords tab to track their progress
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={StarIcon} size={16} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">Tracked Keywords</h3>
          <span className="text-xs text-gray-500">({keywords.length})</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/30 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Keyword
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Page
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Trend (30d)
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Position
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Clicks
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Impr.
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {keywords.map((kw) => {
              const isPositionUp = kw.stats.positionChange > 0;
              const isPositionDown = kw.stats.positionChange < 0;

              return (
                <tr key={kw.id} className="group hover:bg-gray-50/60 transition-colors">
                  {/* Keyword */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={StarIcon} size={14} className="text-amber-500" fill="currentColor" />
                      <span className="font-medium text-gray-900 truncate max-w-[200px]" title={kw.query}>
                        {kw.query}
                      </span>
                    </div>
                  </td>

                  {/* Page */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 font-mono truncate max-w-[150px] block">
                      {kw.page_url.replace("https://domyhomework.co", "") || "/"}
                    </span>
                  </td>

                  {/* Sparkline */}
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <PositionSparkline data={kw.history || []} />
                    </div>
                  </td>

                  {/* Position */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={cn(
                        "font-mono font-medium tabular-nums",
                        kw.stats.position <= 3 && "text-emerald-600 font-bold"
                      )}>
                        {formatPosition(kw.stats.position)}
                      </span>
                      {kw.stats.positionChange !== 0 && (
                        <span className={cn(
                          "flex items-center text-[10px] font-medium tabular-nums",
                          isPositionUp ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {isPositionUp ? (
                            <HugeiconsIcon icon={TradeUpIcon} size={12} />
                          ) : (
                            <HugeiconsIcon icon={TradeDownIcon} size={12} />
                          )}
                          {Math.abs(kw.stats.positionChange).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Clicks */}
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-gray-700 tabular-nums">
                      {formatNumber(kw.stats.clicks)}
                    </span>
                  </td>

                  {/* Impressions */}
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-gray-500 tabular-nums">
                      {formatNumber(kw.stats.impressions)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onViewDetails(kw)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View details"
                      >
                        <HugeiconsIcon icon={ChartLineData02Icon} size={14} />
                      </button>
                      <button
                        onClick={() => onUntrack(kw.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Untrack"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}