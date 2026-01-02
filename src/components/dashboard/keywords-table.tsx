"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import { TrendingUp, TrendingDown, Sparkles, ExternalLink } from "lucide-react";
import type { KeywordRanking } from "@/types/database";

interface KeywordWithChange extends KeywordRanking {
  positionChange: number;
  clicksChange: number;
  impressionsChange: number;
  isNew: boolean;
}

interface KeywordsTableProps {
  keywords: KeywordWithChange[];
  title?: string;
  showUrl?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
}

export function KeywordsTable({ keywords, title, showUrl = false, sortBy, sortOrder, onSort }: KeywordsTableProps) {
  const SortHeader = ({ column, label }: { column: string; label: string }) => (
    <th
      onClick={() => onSort?.(column)}
      className={cn(
        "px-4 py-3 text-right text-xs font-medium uppercase tracking-wider",
        onSort ? "cursor-pointer hover:bg-gray-100 select-none" : "",
        sortBy === column ? "text-blue-600" : "text-gray-500"
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortBy === column && (
          <span>{sortOrder === "desc" ? "↓" : "↑"}</span>
        )}
      </span>
    </th>
  );

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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Keyword</th>
                <SortHeader column="position" label="Position" />
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Change
                </th>
                <SortHeader column="clicks" label="Clicks" />
                <SortHeader column="impressions" label="Impr" />
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">CTR</th>
                {showUrl && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Page</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {keywords.map((keyword, idx) => (
                <tr key={`${keyword.query}-${idx}`} className="hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      {keyword.isNew && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          <Sparkles className="h-3 w-3" />
                          New
                        </span>
                      )}
                      <span className="font-medium text-gray-900 truncate max-w-[300px]">
                        {keyword.query}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-medium">{formatPosition(keyword.position)}</span>
                  </td>
                  <td className="py-3 text-right">
                    {keyword.positionChange !== 0 ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 text-xs font-medium",
                          keyword.positionChange > 0 ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {keyword.positionChange > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(keyword.positionChange).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-medium">{formatNumber(keyword.clicks)}</span>
                  </td>
                  <td className="py-3 text-right text-gray-600">
                    {formatNumber(keyword.impressions)}
                  </td>
                  <td className="py-3 text-right text-gray-600">{formatPercent(keyword.ctr)}</td>
                  {showUrl && keyword.page_url && (
                    <td className="py-3 pl-4">
                      <a
                        href={keyword.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 truncate max-w-[200px]"
                      >
                        {keyword.page_url.replace("https://domyhomework.co", "")}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {keywords.length === 0 && (
          <p className="py-8 text-center text-gray-500">No keywords found</p>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for gainers/losers
interface CompactKeywordListProps {
  keywords: KeywordWithChange[];
  title: string;
  type: "gainers" | "losers" | "new";
}

export function CompactKeywordList({ keywords, title, type }: CompactKeywordListProps) {
  const bgColor =
    type === "gainers" ? "bg-green-50" : type === "losers" ? "bg-red-50" : "bg-purple-50";
  const textColor =
    type === "gainers"
      ? "text-green-700"
      : type === "losers"
        ? "text-red-700"
        : "text-purple-700";
  const Icon = type === "gainers" ? TrendingUp : type === "losers" ? TrendingDown : Sparkles;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Icon className={cn("h-4 w-4", textColor)} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {keywords.slice(0, 5).map((keyword, idx) => (
            <div
              key={`${keyword.query}-${idx}`}
              className={cn("flex items-center justify-between rounded-lg p-2", bgColor)}
            >
              <span className="truncate max-w-[200px] text-sm font-medium text-gray-900">
                {keyword.query}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Pos {formatPosition(keyword.position)}
                </span>
                {type !== "new" && (
                  <span className={cn("text-sm font-medium", textColor)}>
                    {type === "gainers" ? "+" : "-"}
                    {Math.abs(keyword.positionChange).toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {keywords.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-500">None found</p>
        )}
      </CardContent>
    </Card>
  );
}
