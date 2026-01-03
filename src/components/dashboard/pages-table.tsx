"use client";

import { cn, formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Home01Icon, 
  File01Icon, 
  Mortarboard02Icon, 
  Layers01Icon, 
  UserGroupIcon, 
  Wrench01Icon, 
  Menu01Icon, 
  Link01Icon,
  Alert02Icon,
  ArrowRight01Icon
} from "@hugeicons/core-free-icons";

type DetailedPageType = "home" | "static" | "t1_service" | "t2_service" | "blog" | "writers" | "tools" | "other";

interface PageItem {
  page_url: string;
  page_type: DetailedPageType;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PagesTableProps {
  pages: PageItem[];
  title?: string;
  pageTypeLabels?: Record<string, string>;
}

// -- Config: Mapped to Hugeicons for "Pro" look --
const pageTypeConfig: Record<DetailedPageType, { icon: any; color: string; label: string }> = {
  home: { icon: Home01Icon, color: "text-indigo-600 bg-indigo-50 border-indigo-200", label: "Home" },
  static: { icon: File01Icon, color: "text-gray-600 bg-gray-50 border-gray-200", label: "Static" },
  t1_service: { icon: Mortarboard02Icon, color: "text-blue-600 bg-blue-50 border-blue-200", label: "Main Service" },
  t2_service: { icon: Layers01Icon, color: "text-violet-600 bg-violet-50 border-violet-200", label: "Sub Service" },
  blog: { icon: File01Icon, color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Blog" },
  writers: { icon: UserGroupIcon, color: "text-pink-600 bg-pink-50 border-pink-200", label: "Writers" },
  tools: { icon: Wrench01Icon, color: "text-amber-600 bg-amber-50 border-amber-200", label: "Tools" },
  other: { icon: Menu01Icon, color: "text-gray-500 bg-gray-50 border-gray-200", label: "Other" },
};

export function PagesTable({ pages, title, pageTypeLabels }: PagesTableProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Page URL</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Clicks</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Impr.</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">CTR</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Avg Pos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pages.length === 0 ? (
               <tr><td colSpan={6} className="p-8 text-center text-gray-500">No pages found.</td></tr>
            ) : (
              pages.map((page, idx) => {
                const config = pageTypeConfig[page.page_type] || pageTypeConfig.other;
                const displayUrl = page.page_url
                  .replace("https://domyhomework.co", "") // Strip domain for cleaner look
                  .replace(/\/$/, "") || "/";
                
                const typeLabel = pageTypeLabels?.[page.page_type] || config.label;
                
                // Intelligence: Flag High Impression / Low CTR pages
                const isOpportunity = page.impressions > 1000 && page.ctr < 0.01;

                return (
                  <tr key={`${page.page_url}-${idx}`} className="group hover:bg-gray-50/60 transition-colors">
                    {/* URL Column */}
                    <td className="px-4 py-2.5 max-w-[300px]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate" title={page.page_url}>
                          {displayUrl}
                        </span>
                        <a
                          href={page.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity"
                        >
                          <HugeiconsIcon icon={Link01Icon} size={14} />
                        </a>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium border",
                          config.color
                        )}
                      >
                        <HugeiconsIcon icon={config.icon} size={12} strokeWidth={2} />
                        {typeLabel}
                      </span>
                    </td>

                    {/* Metrics (Tabular Nums) */}
                    <td className="px-4 py-2.5 text-right font-mono text-gray-900 tabular-nums">
                      {formatNumber(page.clicks)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-500 tabular-nums">
                      {formatNumber(page.impressions)}
                      {isOpportunity && (
                         <span className="ml-2 inline-block align-middle text-amber-500" title="Low CTR Opportunity">
                            <HugeiconsIcon icon={Alert02Icon} size={12} />
                         </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-500 tabular-nums">
                      {formatPercent(page.ctr)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-500 tabular-nums">
                      {formatPosition(page.position)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- Type Breakdown Component (Refactored) --
interface PerformanceByType {
  type: DetailedPageType;
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  pageCount: number;
}

interface TypeBreakdownProps {
  data: PerformanceByType[];
  pageTypeLabels?: Record<string, string>;
}

export function TypeBreakdown({ data, pageTypeLabels }: TypeBreakdownProps) {
  const sortedData = [...data].sort((a, b) => b.clicks - a.clicks);
  const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0);

  // Helper for progress bar colors (mapped to Tailwind classes)
  const getBarColor = (type: DetailedPageType) => {
    const map: Record<DetailedPageType, string> = {
      home: "bg-indigo-500",
      static: "bg-gray-500",
      t1_service: "bg-blue-500",
      t2_service: "bg-violet-500",
      blog: "bg-emerald-500",
      writers: "bg-pink-500",
      tools: "bg-amber-500",
      other: "bg-gray-400",
    };
    return map[type] || "bg-gray-400";
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm h-full">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Traffic Distribution</h3>
      
      <div className="space-y-4">
        {sortedData.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No data available.</p>
        ) : (
          sortedData.map((item) => {
            const config = pageTypeConfig[item.type] || pageTypeConfig.other;
            const percentage = totalClicks > 0 ? (item.clicks / totalClicks) * 100 : 0;
            const typeLabel = pageTypeLabels?.[item.type] || config.label;

            return (
              <div key={item.type} className="group">
                {/* Label Row */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1 rounded-md", config.color.replace('border', ''))}>
                       <HugeiconsIcon icon={config.icon} size={12} />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{typeLabel}</span>
                    <span className="text-[10px] text-gray-400 tabular-nums">({item.pageCount} pages)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900 tabular-nums">{formatNumber(item.clicks)}</span>
                    <span className="ml-1 text-[10px] text-gray-400">clicks</span>
                  </div>
                </div>

                {/* Progress Bar Row */}
                <div className="flex items-center gap-3">
                   <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                     <div 
                       className={cn("h-full rounded-full transition-all duration-500", getBarColor(item.type))} 
                       style={{ width: `${percentage}%` }}
                     />
                   </div>
                   <span className="w-8 text-right text-[10px] text-gray-500 tabular-nums font-medium">
                     {percentage.toFixed(0)}%
                   </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}