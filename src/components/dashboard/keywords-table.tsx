"use client";

import { cn, formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  TradeUpIcon,
  TradeDownIcon,
  MinusSignIcon,
  Link01Icon,
  Copy01Icon,
  Alert02Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";

interface KeywordItem {
  id: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  page_url: string | null;
  positionChange: number;
  isNew: boolean;
}

interface KeywordsTableProps {
  keywords: KeywordItem[];
  title?: string;
  showUrl?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  trackedKeywords?: Set<string>;
  onToggleTrack?: (query: string, page_url: string) => void;
}

export function KeywordsTable({
  keywords,
  title,
  showUrl = false,
  sortBy,
  sortOrder,
  onSort,
  trackedKeywords = new Set(),
  onToggleTrack,
}: KeywordsTableProps) {
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatUrlPath = (url: string | null) => {
    if (!url) return "-";
    try {
      const urlObj = new URL(url);
      return urlObj.pathname === "/" ? "/" : urlObj.pathname;
    } catch {
      return url;
    }
  };

  const SortHeader = ({ column, label, align = "right" }: { column: string; label: string; align?: "left" | "right" }) => (
    <th
      onClick={() => onSort?.(column)}
      className={cn(
        "px-3 py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none",
        align === "left" ? "text-left" : "text-right",
        sortBy === column ? "text-[#FF6B35]" : "text-gray-500"
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortBy === column && (
          <span className="text-[#FF6B35]">{sortOrder === "desc" ? "↓" : "↑"}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {title && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-8 px-2 py-2"></th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Keyword
              </th>
              {showUrl && (
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  URL
                </th>
              )}
              <SortHeader column="position" label="Pos" />
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Δ
              </th>
              <SortHeader column="clicks" label="Clicks" />
              <SortHeader column="impressions" label="Impr" />
              <SortHeader column="ctr" label="CTR" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {keywords.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  No keywords found
                </td>
              </tr>
            ) : (
              keywords.map((k) => {
                const isTracked = trackedKeywords.has(`${k.query}|${k.page_url}`);
                const isZeroClick = k.impressions > 1000 && k.ctr < 0.01;
                const isTop3 = k.position <= 3;
                const isStriking = k.position > 10 && k.position <= 20;

                return (
                  <tr 
                    key={k.id} 
                    className="group hover:bg-blue-50/30 transition-colors"
                  >
                    {/* Star */}
                    <td className="px-2 py-1.5">
                      {onToggleTrack && k.page_url && (
                        <button
                          onClick={() => onToggleTrack(k.query, k.page_url!)}
                          className={cn(
                            "p-1 rounded transition-all",
                            isTracked
                              ? "text-[#FF6B35]"
                              : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-[#FF6B35]"
                          )}
                        >
                          <HugeiconsIcon
                            icon={StarIcon}
                            size={14}
                            fill={isTracked ? "currentColor" : "none"}
                          />
                        </button>
                      )}
                    </td>

                    {/* Keyword */}
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-sm font-medium text-gray-900 truncate max-w-[250px]" 
                          title={k.query}
                        >
                          {k.query}
                        </span>
                        
                        {/* Badges */}
                        {k.isNew && (
                          <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                            NEW
                          </span>
                        )}
                        {isZeroClick && (
                          <HugeiconsIcon 
                            icon={Alert02Icon} 
                            size={12} 
                            className="text-amber-500" 
                            aria-label="High impressions, low CTR"
                          />
                        )}
                        
                        {/* Copy button */}
                        <button
                          onClick={() => copyToClipboard(k.query)}
                          className="p-0.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-gray-600 transition-all"
                        >
                          <HugeiconsIcon icon={Copy01Icon} size={12} />
                        </button>
                      </div>
                    </td>

                    {/* URL */}
                    {showUrl && (
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1">
                          <span 
                            className="text-xs text-gray-500 font-mono truncate max-w-[150px]"
                            title={k.page_url || ""}
                          >
                            {formatUrlPath(k.page_url)}
                          </span>
                          {k.page_url && (
                            <a
                              href={k.page_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-300 opacity-0 group-hover:opacity-100 hover:text-[#1A73E8] transition-all"
                            >
                              <HugeiconsIcon icon={Link01Icon} size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Position */}
                    <td className="px-3 py-1.5 text-right">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          isTop3 && "text-[#00C853]",
                          isStriking && "text-[#1A73E8]",
                          !isTop3 && !isStriking && "text-gray-900"
                        )}
                      >
                        {formatPosition(k.position)}
                      </span>
                    </td>

                    {/* Position Change */}
                    <td className="px-3 py-1.5 text-right">
                      {k.positionChange !== 0 ? (
                        <span
                          className={cn(
                            "inline-flex items-center text-xs font-semibold tabular-nums",
                            k.positionChange > 0 ? "text-[#00C853]" : "text-[#FF5252]"
                          )}
                        >
                          {k.positionChange > 0 ? (
                            <HugeiconsIcon icon={TradeUpIcon} size={12} />
                          ) : (
                            <HugeiconsIcon icon={TradeDownIcon} size={12} />
                          )}
                          {Math.abs(k.positionChange).toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-gray-300">
                          <HugeiconsIcon icon={MinusSignIcon} size={12} />
                        </span>
                      )}
                    </td>

                    {/* Clicks */}
                    <td className="px-3 py-1.5 text-right">
                      <span className="text-sm font-medium text-gray-900 tabular-nums">
                        {formatNumber(k.clicks)}
                      </span>
                    </td>

                    {/* Impressions */}
                    <td className="px-3 py-1.5 text-right">
                      <span className="text-sm text-gray-600 tabular-nums">
                        {formatNumber(k.impressions)}
                      </span>
                    </td>

                    {/* CTR */}
                    <td className="px-3 py-1.5 text-right">
                      <span className="text-sm text-gray-600 tabular-nums">
                        {formatPercent(k.ctr)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer with count */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
        <p className="text-xs text-gray-500">
          Showing <span className="font-semibold text-gray-700">{keywords.length}</span> keywords
        </p>
      </div>
    </div>
  );
}

// Compact Keyword List (for sidebar/widgets)
export function CompactKeywordList({ 
  keywords, 
  title, 
  type 
}: { 
  keywords: KeywordItem[]; 
  title: string; 
  type: "gainers" | "losers" | "new";
}) {
  const colorMap = {
    gainers: { bg: "bg-green-50", text: "text-[#00C853]", icon: TradeUpIcon },
    losers: { bg: "bg-red-50", text: "text-[#FF5252]", icon: TradeDownIcon },
    new: { bg: "bg-blue-50", text: "text-[#1A73E8]", icon: StarIcon },
  };

  const colors = colorMap[type];

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className={cn("px-3 py-2 border-b border-gray-200", colors.bg)}>
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={colors.icon} size={14} className={colors.text} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">{title}</h3>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {keywords.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-400 text-center">No data</p>
        ) : (
          keywords.slice(0, 5).map((k) => (
            <div key={k.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
              <span className="text-sm text-gray-900 truncate max-w-[180px]" title={k.query}>
                {k.query}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 tabular-nums">
                  #{formatPosition(k.position)}
                </span>
                {type !== "new" && (
                  <span className={cn("text-xs font-semibold tabular-nums", colors.text)}>
                    {type === "gainers" ? "+" : "-"}{Math.abs(k.positionChange).toFixed(0)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}