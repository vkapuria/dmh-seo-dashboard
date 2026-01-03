"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  StarIcon,
  TradeUpIcon,
  TradeDownIcon,
  Calendar03Icon,
  Link01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

interface HistoryPoint {
  date: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

interface KeywordStats {
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

interface KeywordData {
  id: string;
  query: string;
  page_url: string;
  created_at: string;
  notes: string | null;
  target_position: number | null;
  stats: KeywordStats;
  history: HistoryPoint[];
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-xl text-xs">
        <p className="font-medium text-gray-900 mb-2">
          {format(parseISO(label), "EEE, MMM d, yyyy")}
        </p>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600 capitalize">{entry.name}</span>
              </div>
              <span className="font-semibold text-gray-900 tabular-nums">
                {entry.name === "position" 
                  ? entry.value.toFixed(1)
                  : entry.value.toLocaleString()
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function KeywordDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const query = searchParams.get("q");
  const pageUrl = searchParams.get("page");
  
  const [keywordData, setKeywordData] = useState<KeywordData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(90);
  const [isTracked, setIsTracked] = useState(false);

  const fetchKeywordData = useCallback(async () => {
    if (!query) return;
    
    setIsLoading(true);
    try {
      // Fetch from tracked keywords API with history
      const params = new URLSearchParams({
        query: query,
        days: days.toString(),
        history: "true",
      });
      
      const res = await fetch(`/api/tracked-keywords?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tracked && data.tracked.length > 0) {
          // Find the matching keyword+page combo
          const match = pageUrl 
            ? data.tracked.find((t: any) => t.query === query && t.page_url === pageUrl)
            : data.tracked[0];
          
          if (match) {
            setKeywordData(match);
            setIsTracked(true);
          }
        }
      }
      
      // If not tracked, fetch from regular keywords API
      if (!keywordData) {
        const kwRes = await fetch(`/api/keyword-history?query=${encodeURIComponent(query)}&days=${days}${pageUrl ? `&page_url=${encodeURIComponent(pageUrl)}` : ""}`);
        if (kwRes.ok) {
          const kwData = await kwRes.json();
          setKeywordData(kwData);
          setIsTracked(false);
        }
      }
    } catch (error) {
      console.error("Error fetching keyword data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [query, pageUrl, days]);

  useEffect(() => {
    fetchKeywordData();
  }, [fetchKeywordData]);

  const handleToggleTrack = async () => {
    if (!keywordData) return;
    
    try {
      if (isTracked) {
        await fetch(`/api/tracked-keywords?query=${encodeURIComponent(keywordData.query)}&page_url=${encodeURIComponent(keywordData.page_url)}`, {
          method: "DELETE",
        });
        setIsTracked(false);
      } else {
        await fetch("/api/tracked-keywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            query: keywordData.query, 
            page_url: keywordData.page_url 
          }),
        });
        setIsTracked(true);
      }
    } catch (error) {
      console.error("Error toggling track:", error);
    }
  };

  if (!query) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No keyword specified</p>
          <Button onClick={() => router.push("/")} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <HugeiconsIcon icon={Loading03Icon} size={32} className="animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading keyword data...</p>
        </div>
      </div>
    );
  }

  if (!keywordData) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Keyword not found</p>
          <Button onClick={() => router.push("/")} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { stats, history } = keywordData;
  const isPositionUp = stats.positionChange > 0;
  const isPositionDown = stats.positionChange < 0;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Back Button */}
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} size={18} />
              Back to Dashboard
            </button>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Date Range */}
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
                {[30, 90, 180, 365].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      days === d
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {d === 365 ? "1y" : d === 180 ? "6m" : d === 90 ? "3m" : "30d"}
                  </button>
                ))}
              </div>

              {/* Track Button */}
              <Button
                onClick={handleToggleTrack}
                variant={isTracked ? "default" : "outline"}
                size="sm"
                className={cn(
                  "gap-2",
                  isTracked && "bg-amber-500 hover:bg-amber-600"
                )}
              >
                <HugeiconsIcon 
                  icon={StarIcon} 
                  size={16} 
                  fill={isTracked ? "currentColor" : "none"} 
                />
                {isTracked ? "Tracking" : "Track Keyword"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          
          {/* Keyword Title Section */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                "{keywordData.query}"
              </h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <HugeiconsIcon icon={Link01Icon} size={14} />
                <a 
                  href={keywordData.page_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 hover:underline"
                >
                  {keywordData.page_url.replace("https://domyhomework.co", "") || "/"}
                </a>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Position */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Position</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-3xl font-bold text-gray-900 tabular-nums">
                    {formatPosition(stats.position)}
                  </span>
                  {stats.positionChange !== 0 && (
                    <span className={cn(
                      "flex items-center text-sm font-medium mb-1",
                      isPositionUp ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {isPositionUp ? (
                        <HugeiconsIcon icon={TradeUpIcon} size={16} />
                      ) : (
                        <HugeiconsIcon icon={TradeDownIcon} size={16} />
                      )}
                      {Math.abs(stats.positionChange).toFixed(1)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Clicks */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-3xl font-bold text-gray-900 tabular-nums">
                    {formatNumber(stats.clicks)}
                  </span>
                  {stats.clicksChange !== 0 && (
                    <span className={cn(
                      "text-sm font-medium mb-1",
                      stats.clicksChange > 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {stats.clicksChange > 0 ? "+" : ""}{stats.clicksChange.toFixed(0)}%
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Impressions */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-3xl font-bold text-gray-900 tabular-nums">
                    {formatNumber(stats.impressions)}
                  </span>
                  {stats.impressionsChange !== 0 && (
                    <span className={cn(
                      "text-sm font-medium mb-1",
                      stats.impressionsChange > 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {stats.impressionsChange > 0 ? "+" : ""}{stats.impressionsChange.toFixed(0)}%
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CTR */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</p>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900 tabular-nums">
                    {formatPercent(stats.ctr)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Position Chart */}
          <Card className="border-gray-200">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-sm font-semibold">Position History</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      tickFormatter={(date) => format(parseISO(date), "MMM d")}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={30}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                      reversed
                      domain={["auto", "auto"]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="position"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0, fill: "#3b82f6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Clicks & Impressions Chart */}
          <Card className="border-gray-200">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-sm font-semibold">Traffic Performance</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      tickFormatter={(date) => format(parseISO(date), "MMM d")}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={30}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }} />
                    <Bar
                      yAxisId="left"
                      dataKey="clicks"
                      name="clicks"
                      fill="#3b82f6"
                      barSize={16}
                      radius={[2, 2, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="impressions"
                      name="impressions"
                      stroke="#e11d48"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Daily Data Table */}
          <Card className="border-gray-200">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-sm font-semibold">Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/50 sticky top-0">
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Position</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Clicks</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Impressions</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...history].reverse().map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-gray-900 font-medium">
                          {format(parseISO(day.date), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          {day.position.toFixed(1)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          {day.clicks}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-gray-500">
                          {day.impressions}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-gray-500">
                          {formatPercent(day.ctr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}