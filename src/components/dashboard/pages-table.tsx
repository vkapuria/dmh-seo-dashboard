"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import { FileText, Wrench, GraduationCap, Home, MoreHorizontal, ExternalLink, Users, Layers } from "lucide-react";

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

const pageTypeConfig: Record<DetailedPageType, { icon: typeof FileText; color: string; label: string }> = {
  home: { icon: Home, color: "text-indigo-600 bg-indigo-100", label: "Home" },
  static: { icon: FileText, color: "text-gray-600 bg-gray-100", label: "Static" },
  t1_service: { icon: GraduationCap, color: "text-green-600 bg-green-100", label: "T1 Service" },
  t2_service: { icon: Layers, color: "text-emerald-600 bg-emerald-100", label: "T2 Service" },
  blog: { icon: FileText, color: "text-blue-600 bg-blue-100", label: "Blog" },
  writers: { icon: Users, color: "text-pink-600 bg-pink-100", label: "Writers" },
  tools: { icon: Wrench, color: "text-purple-600 bg-purple-100", label: "Tools" },
  other: { icon: MoreHorizontal, color: "text-orange-600 bg-orange-100", label: "Other" },
};

export function PagesTable({ pages, title, pageTypeLabels }: PagesTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-left font-medium text-gray-500">Page</th>
                <th className="pb-3 text-left font-medium text-gray-500">Type</th>
                <th className="pb-3 text-right font-medium text-gray-500">Clicks</th>
                <th className="pb-3 text-right font-medium text-gray-500">Impr.</th>
                <th className="pb-3 text-right font-medium text-gray-500">CTR</th>
                <th className="pb-3 text-right font-medium text-gray-500">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.map((page, idx) => {
                const config = pageTypeConfig[page.page_type] || pageTypeConfig.other;
                const Icon = config.icon;
                const displayUrl = page.page_url
                  .replace("https://domyhomework.co", "")
                  .replace(/\/$/, "") || "/";
                const typeLabel = pageTypeLabels?.[page.page_type] || config.label;

                return (
                  <tr key={`${page.page_url}-${idx}`} className="hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <a
                        href={page.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <span className="truncate max-w-[300px]">{displayUrl}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </td>
                    <td className="py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          config.color
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {typeLabel}
                      </span>
                    </td>
                    <td className="py-3 text-right font-medium">{formatNumber(page.clicks)}</td>
                    <td className="py-3 text-right text-gray-600">{formatNumber(page.impressions)}</td>
                    <td className="py-3 text-right text-gray-600">{formatPercent(page.ctr)}</td>
                    <td className="py-3 text-right text-gray-600">{formatPosition(page.position)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pages.length === 0 && <p className="py-8 text-center text-gray-500">No pages found</p>}
      </CardContent>
    </Card>
  );
}

// Performance by type breakdown
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

  const getBarColor = (type: DetailedPageType) => {
    const colors: Record<DetailedPageType, string> = {
      home: "bg-indigo-500",
      static: "bg-gray-500",
      t1_service: "bg-green-500",
      t2_service: "bg-emerald-500",
      blog: "bg-blue-500",
      writers: "bg-pink-500",
      tools: "bg-purple-500",
      other: "bg-orange-500",
    };
    return colors[type] || "bg-gray-500";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Performance by Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedData.map((item) => {
            const config = pageTypeConfig[item.type] || pageTypeConfig.other;
            const Icon = config.icon;
            const percentage = totalClicks > 0 ? (item.clicks / totalClicks) * 100 : 0;
            const typeLabel = pageTypeLabels?.[item.type] || config.label;

            return (
              <div key={item.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium",
                      config.color
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {typeLabel}
                    <span className="text-xs opacity-70">({item.pageCount})</span>
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatNumber(item.clicks)} clicks
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", getBarColor(item.type))}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatNumber(item.impressions)} impr</span>
                  <span>{formatPercent(item.ctr)} CTR</span>
                  <span>Pos {formatPosition(item.avgPosition)}</span>
                </div>
              </div>
            );
          })}
        </div>
        {data.length === 0 && <p className="py-4 text-center text-gray-500">No data available</p>}
      </CardContent>
    </Card>
  );
}