"use client";

import { useState, useEffect, useCallback } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TrendChart, MultiTrendChart } from "@/components/dashboard/trend-chart";
import { KeywordsTable, CompactKeywordList } from "@/components/dashboard/keywords-table";
import { PagesTable, TypeBreakdown } from "@/components/dashboard/pages-table";
import { AlertsList, AlertSummary } from "@/components/dashboard/alerts-list";
import {
  HomepageHealth,
  TrafficWatchlist,
  InsightsList,
  InsightsSummaryWidget,
} from "@/components/dashboard/insights";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RefreshCw,
  Search,
  FileText,
  Bell,
  Settings,
  TrendingUp,
  BarChart3,
  Loader2,
  Lightbulb,
} from "lucide-react";
import type { Insight, InsightCategory, InsightPriority } from "@/types/database";
import { cn } from "@/lib/utils";

type TabType = "overview" | "keywords" | "pages" | "alerts" | "insights" | "settings";

interface MetricsData {
  summary: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    clicksChange: number;
    impressionsChange: number;
    ctrChange: number;
    positionChange: number;
  };
  daily: Array<{
    date: string;
    total_clicks: number;
    total_impressions: number;
    avg_ctr: number;
    avg_position: number;
  }>;
}

interface KeywordItem {
  id: string;
  date: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  page_url: string | null;
  created_at: string;
  positionChange: number;
  clicksChange: number;
  impressionsChange: number;
  isNew: boolean;
}

interface KeywordsData {
  keywords: KeywordItem[];
  gainers: KeywordItem[];
  losers: KeywordItem[];
  newKeywords: KeywordItem[];
  latestDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  previousPeriodStart: string;
  previousPeriodEnd: string;
  compareDays: number;
  pagesByType: Record<string, string[]>;
  pageTypeLabels: Record<string, string>;
  total: number;
}

interface PageItem {
  page_url: string;
  page_type: "home" | "static" | "t1_service" | "t2_service" | "blog" | "writers" | "tools" | "other";
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PerformanceByTypeItem {
  type: "home" | "static" | "t1_service" | "t2_service" | "blog" | "writers" | "tools" | "other";
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  pageCount: number;
}

interface PagesData {
  pages: PageItem[];
  performanceByType: PerformanceByTypeItem[];
  pageTypeLabels: Record<string, string>;
  total: number;
  dateRange: { start: string; end: string };
}

interface AlertItem {
  id: string;
  created_at: string;
  type: "position_drop" | "position_gain" | "traffic_spike" | "traffic_drop" | "new_keyword" | "lost_keyword";
  severity: "info" | "warning" | "critical";
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
}

interface AlertsData {
  alerts: AlertItem[];
  unreadCounts: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
}

interface SyncItem {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: "running" | "completed" | "failed";
  records_synced: number;
  error_message: string | null;
}

interface SyncData {
  syncs: SyncItem[];
}

interface HomepageHealthData {
  date: string;
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
  keywords_page_one: number;
  keywords_page_two: number;
  keywords_page_three_plus: number;
  total_keywords: number;
  clicksChange: number;
  impressionsChange: number;
  positionChange: number;
  keywordsPageOneChange: number;
}

interface WatchlistKeyword {
  query: string;
  latest_clicks_28d: number | null;
  latest_impressions_28d: number | null;
  latest_position: number | null;
  position_trend: number | null;
  ranking_page_url: string | null;
  is_brand_keyword: boolean;
  is_core_keyword: boolean;
}

interface InsightsSummary {
  total: number;
  byCategory: Record<InsightCategory, number>;
  byPriority: Record<InsightPriority, number>;
  homepage: number;
  highValue: number;
}

interface InsightsData {
  insights: Insight[];
  summary: InsightsSummary;
  homepage: HomepageHealthData | null;
  keywordsAtRisk: WatchlistKeyword[];
  watchlist: {
    needsAttention: WatchlistKeyword[];
    growing: WatchlistKeyword[];
    stable: WatchlistKeyword[];
    untapped: WatchlistKeyword[];
  };
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [days, setDays] = useState(28);
  const [showMoreDays, setShowMoreDays] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Keyword filter states
  const [keywordSearch, setKeywordSearch] = useState("");
  const [keywordPageType, setKeywordPageType] = useState("");
  const [keywordPageFilter, setKeywordPageFilter] = useState("");
  const [keywordCompareDays, setKeywordCompareDays] = useState(7);
  const [keywordSortBy, setKeywordSortBy] = useState("clicks");
  const [keywordSortOrder, setKeywordSortOrder] = useState<"asc" | "desc">("desc");
  const [isKeywordsLoading, setIsKeywordsLoading] = useState(false);
  // Pages filter states
  const [pagesTypeFilter, setPagesTypeFilter] = useState("");
  // Data states
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [keywords, setKeywords] = useState<KeywordsData | null>(null);
  const [pages, setPages] = useState<PagesData | null>(null);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncData | null>(null);

  // Fetch keywords with filters
  const fetchKeywords = useCallback(async () => {
    setIsKeywordsLoading(true);
    try {
      const params = new URLSearchParams({
        compareDays: keywordCompareDays.toString(),
        limit: "500",
        sort: keywordSortBy,
        order: keywordSortOrder,
      });
      if (keywordSearch) params.set("search", keywordSearch);
      if (keywordPageFilter) params.set("pageUrl", keywordPageFilter);
      else if (keywordPageType) params.set("pageType", keywordPageType);

      const res = await fetch(`/api/keywords?${params}`);
      if (res.ok) {
        const data = await res.json();
        setKeywords(data);
      }
    } catch (error) {
      console.error("Error fetching keywords:", error);
    } finally {
      setIsKeywordsLoading(false);
    }
  }, [keywordSearch, keywordPageType, keywordPageFilter, keywordCompareDays, keywordSortBy, keywordSortOrder]);

  // Fetch all data (initial load)
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [metricsRes, keywordsRes, pagesRes, alertsRes, insightsRes, syncRes] = await Promise.all([
        fetch(`/api/metrics?days=${days}`),
        fetch(`/api/keywords?compareDays=7&limit=500`),
        fetch(`/api/pages?days=${days}&limit=50`),
        fetch(`/api/alerts?limit=50`),
        fetch(`/api/insights`),
        fetch(`/api/sync`),
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (keywordsRes.ok) setKeywords(await keywordsRes.json());
      if (pagesRes.ok) setPages(await pagesRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (insightsRes.ok) setInsights(await insightsRes.json());
      if (syncRes.ok) setSyncStatus(await syncRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch keywords when filters change
  useEffect(() => {
    if (!isLoading && activeTab === "keywords") {
      fetchKeywords();
    }
  }, [keywordSearch, keywordPageType, keywordPageFilter, keywordCompareDays, activeTab, isLoading, fetchKeywords]);

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMoreDays(false);
    if (showMoreDays) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showMoreDays]);

  // Trigger sync
  const handleSync = async (mode: "daily" | "backfill" = "daily") => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/sync?mode=${mode}`, { method: "POST" });
      const result = await res.json();
      if (result.success) {
        await fetchData();
      } else {
        alert(`Sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Sync error:", error);
      alert("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  // Mark alerts as read
  const handleMarkAlertsRead = async (ids: string[]) => {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      setAlerts((prev) =>
        prev
          ? {
              ...prev,
              alerts: prev.alerts.map((a) => (ids.includes(a.id) ? { ...a, is_read: true } : a)),
              unreadCounts: {
                ...prev.unreadCounts,
                total: prev.unreadCounts.total - ids.length,
              },
            }
          : null
      );
    } catch (error) {
      console.error("Error marking alerts read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setAlerts((prev) =>
        prev
          ? {
              ...prev,
              alerts: prev.alerts.map((a) => ({ ...a, is_read: true })),
              unreadCounts: { critical: 0, warning: 0, info: 0, total: 0 },
            }
          : null
      );
    } catch (error) {
      console.error("Error marking all alerts read:", error);
    }
  };

  // Handle insight actions
  const handleInsightDismiss = async (id: string) => {
    try {
      await fetch("/api/insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "dismiss" }),
      });
      setInsights((prev) =>
        prev
          ? {
              ...prev,
              insights: prev.insights.filter((i) => i.id !== id),
              summary: {
                ...prev.summary,
                total: prev.summary.total - 1,
              },
            }
          : null
      );
    } catch (error) {
      console.error("Error dismissing insight:", error);
    }
  };

  const handleInsightResolve = async (id: string) => {
    try {
      await fetch("/api/insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "resolve" }),
      });
      setInsights((prev) =>
        prev
          ? {
              ...prev,
              insights: prev.insights.filter((i) => i.id !== id),
              summary: {
                ...prev.summary,
                total: prev.summary.total - 1,
              },
            }
          : null
      );
    } catch (error) {
      console.error("Error resolving insight:", error);
    }
  };

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    { id: "keywords" as const, label: "Keywords", icon: Search },
    { id: "pages" as const, label: "Pages", icon: FileText },
    { id: "insights" as const, label: "Insights", icon: Lightbulb },
    { id: "alerts" as const, label: "Alerts", icon: Bell },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">DMH SEO Dashboard</h1>
                <p className="text-xs text-gray-500">domyhomework.co</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {insights && insights.summary.total > 0 && (
                <InsightsSummaryWidget
                  summary={insights.summary}
                  onClick={() => setActiveTab("insights")}
                />
              )}
              {alerts && <AlertSummary counts={alerts.unreadCounts} />}

              {/* Date range selector */}
              <div className="relative flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
                {[7, 28].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      days === d ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {d === 28 ? "28d" : "7d"}
                  </button>
                ))}
                {[90, 180, 365, 480].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      days === d ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100",
                      ![90, 180, 365, 480].includes(days) && "hidden sm:block"
                    )}
                    style={{ display: [90, 180, 365, 480].includes(days) || d === 90 ? undefined : "none" }}
                  >
                    {d === 90 ? "3m" : d === 180 ? "6m" : d === 365 ? "12m" : "16m"}
                  </button>
                ))}
                <div className="relative">
                  <button
                    onClick={() => setShowMoreDays(!showMoreDays)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      [180, 365, 480].includes(days) ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {[180, 365, 480].includes(days) 
                      ? days === 180 ? "6m" : days === 365 ? "12m" : "16m"
                      : "More"
                    } ▾
                  </button>
                  {showMoreDays && (
                    <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      {[
                        { d: 90, label: "3 months" },
                        { d: 180, label: "6 months" },
                        { d: 365, label: "12 months" },
                        { d: 480, label: "16 months" },
                      ].map(({ d, label }) => (
                        <button
                          key={d}
                          onClick={() => {
                            setDays(d);
                            setShowMoreDays(false);
                          }}
                          className={cn(
                            "block w-full px-4 py-2 text-left text-sm hover:bg-gray-100",
                            days === d ? "bg-blue-50 text-blue-700" : "text-gray-700"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={() => handleSync("daily")} disabled={isSyncing} size="sm">
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <nav className="-mb-px flex gap-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.id === "alerts" && alerts && alerts.unreadCounts.total > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {alerts.unreadCounts.total}
                    </span>
                  )}
                  {tab.id === "insights" && insights && insights.summary.total > 0 && (
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      insights.summary.byPriority.critical > 0
                        ? "bg-red-100 text-red-700"
                        : insights.summary.byPriority.high > 0
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                    )}>
                      {insights.summary.total}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === "overview" && metrics && (
              <div className="space-y-6">
                {/* Homepage Health & Traffic Watchlist (Priority Insights) */}
                {insights && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <HomepageHealth
                      data={insights.homepage}
                      onViewDetails={() => {
                        setKeywordPageType("home");
                        setActiveTab("keywords");
                      }}
                    />
                    <TrafficWatchlist
                      needsAttention={insights.watchlist.needsAttention}
                      growing={insights.watchlist.growing}
                      stable={insights.watchlist.stable}
                      untapped={insights.watchlist.untapped}
                      onViewAll={() => setActiveTab("insights")}
                    />
                  </div>
                )}

                {/* Metric cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard
                    title="Total Clicks"
                    value={metrics.summary.clicks}
                    change={metrics.summary.clicksChange}
                  />
                  <MetricCard
                    title="Impressions"
                    value={metrics.summary.impressions}
                    change={metrics.summary.impressionsChange}
                  />
                  <MetricCard
                    title="Avg CTR"
                    value={metrics.summary.ctr}
                    change={metrics.summary.ctrChange}
                    format="percent"
                  />
                  <MetricCard
                    title="Avg Position"
                    value={metrics.summary.position}
                    change={metrics.summary.positionChange}
                    format="position"
                    invertChange
                  />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <MultiTrendChart data={metrics.daily} />
                  <TrendChart data={metrics.daily} metric="position" title="Average Position" />
                </div>

                {/* Keyword highlights */}
                {keywords && (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <CompactKeywordList
                      keywords={keywords.gainers}
                      title="Top Gainers"
                      type="gainers"
                    />
                    <CompactKeywordList
                      keywords={keywords.losers}
                      title="Top Losers"
                      type="losers"
                    />
                    <CompactKeywordList
                      keywords={keywords.newKeywords}
                      title="New Rankings"
                      type="new"
                    />
                  </div>
                )}

                {/* Page type breakdown */}
                {pages && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <TypeBreakdown data={pages.performanceByType} />
                    <PagesTable pages={pages.pages.slice(0, 10)} title="Top Pages" />
                  </div>
                )}
              </div>
            )}

            {/* Keywords Tab */}
            {activeTab === "keywords" && keywords && (
              <div className="space-y-6">
                {/* Filter Controls */}
                <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4">
                  {/* Search Input */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Search Keywords
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search keywords..."
                        value={keywordSearch}
                        onChange={(e) => setKeywordSearch(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Page Type Dropdown (Step 1) */}
                  <div className="min-w-[150px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Page Type
                    </label>
                    <select
                      value={keywordPageType}
                      onChange={(e) => setKeywordPageType(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All Types</option>
                      {Object.entries(keywords.pageTypeLabels || {}).map(([type, label]) => {
                        const count = keywords.pagesByType?.[type]?.length || 0;
                        if (count === 0) return null;
                        return (
                          <option key={type} value={type}>
                            {label} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Page Dropdown (Step 2 - depends on Page Type) */}
                  <div className="min-w-[250px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Specific Page
                    </label>
                    <select
                      value={keywordPageFilter}
                      onChange={(e) => setKeywordPageFilter(e.target.value)}
                      disabled={!keywordPageType}
                      className={cn(
                        "w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
                        !keywordPageType && "bg-gray-50 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      <option value="">
                        {keywordPageType 
                          ? `All ${keywords.pageTypeLabels?.[keywordPageType] || "Pages"}`
                          : "Select type first"
                        }
                      </option>
                      {keywordPageType && keywords.pagesByType?.[keywordPageType]?.map((page) => (
                        <option key={page} value={page}>
                          {page.replace("https://domyhomework.co", "") || "/"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Comparison Period Selector */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Compare vs
                    </label>
                    <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-1">
                      {[7, 14, 28, 30].map((d) => (
                        <button
                          key={d}
                          onClick={() => setKeywordCompareDays(d)}
                          className={cn(
                            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                            keywordCompareDays === d
                              ? "bg-blue-100 text-blue-700"
                              : "text-gray-600 hover:bg-gray-100"
                          )}
                        >
                          {d}d ago
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {(keywordSearch || keywordPageType || keywordPageFilter || keywordCompareDays !== 7) && (
                    <button
                      onClick={() => {
                        setKeywordSearch("");
                        setKeywordPageType("");
                        setKeywordPageFilter("");
                        setKeywordCompareDays(7);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 pb-2"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {/* Results Summary */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {isKeywordsLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      <>
                        Showing <span className="font-medium text-gray-900">{keywords.keywords.length}</span> keywords
                        {keywordPageType && !keywordPageFilter && (
                          <span className="ml-1">
                            for <span className="text-blue-600">{keywords.pageTypeLabels?.[keywordPageType]}</span> pages
                          </span>
                        )}
                        {keywordPageFilter && (
                          <span className="ml-1">
                            for <span className="text-blue-600">{keywordPageFilter.replace("https://domyhomework.co", "") || "/"}</span>
                          </span>
                        )}
                        {keywordSearch && (
                          <span className="ml-1">
                            matching &quot;{keywordSearch}&quot;
                          </span>
                        )}
                        <span className="ml-2 text-gray-400">
                          ({keywords.currentPeriodStart} to {keywords.currentPeriodEnd})
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <KeywordsTable 
                  keywords={keywords.keywords} 
                  title="All Keywords" 
                  showUrl
                  sortBy={keywordSortBy}
                  sortOrder={keywordSortOrder}
                  onSort={(column: string) => {
                    if (keywordSortBy === column) {
                      setKeywordSortOrder(keywordSortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setKeywordSortBy(column);
                      setKeywordSortOrder("desc");
                    }
                  }}
                />
              </div>
            )}

            {/* Pages Tab */}
            {activeTab === "pages" && pages && (
              <div className="space-y-6">
                {/* Filter Controls */}
                <div className="flex items-end gap-4 rounded-lg border border-gray-200 bg-white p-4">
                  <div className="min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Page Type
                    </label>
                    <select
                      value={pagesTypeFilter}
                      onChange={(e) => setPagesTypeFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All Types</option>
                      {Object.entries(pages.pageTypeLabels || {}).map(([type, label]) => (
                        <option key={type} value={type}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {pagesTypeFilter && (
                    <button
                      onClick={() => setPagesTypeFilter("")}
                      className="text-sm text-blue-600 hover:text-blue-800 pb-2"
                    >
                      Clear filter
                    </button>
                  )}
                </div>

                <TypeBreakdown data={pages.performanceByType} pageTypeLabels={pages.pageTypeLabels} />
                <PagesTable 
                  pages={pagesTypeFilter 
                    ? pages.pages.filter(p => p.page_type === pagesTypeFilter)
                    : pages.pages
                  } 
                  title="All Pages"
                  pageTypeLabels={pages.pageTypeLabels}
                />
              </div>
            )}

            {/* Insights Tab */}
            {activeTab === "insights" && insights && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-700">{insights.summary.byCategory.opportunity}</p>
                      <p className="text-sm text-green-600">Opportunities</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-red-700">{insights.summary.byCategory.threat}</p>
                      <p className="text-sm text-red-600">Threats</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-blue-700">{insights.summary.byCategory.pattern}</p>
                      <p className="text-sm text-blue-600">Patterns</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-amber-700">{insights.summary.byCategory.action}</p>
                      <p className="text-sm text-amber-600">Actions</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                    {insights.summary.homepage} Homepage-related
                  </span>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700">
                    {insights.summary.highValue} High-value Keywords
                  </span>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
                    {insights.summary.byPriority.critical} Critical
                  </span>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700">
                    {insights.summary.byPriority.high} High Priority
                  </span>
                </div>

                {/* Insights List */}
                <InsightsList
                  insights={insights.insights}
                  onDismiss={handleInsightDismiss}
                  onResolve={handleInsightResolve}
                />
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === "alerts" && alerts && (
              <AlertsList
                alerts={alerts.alerts}
                onMarkRead={handleMarkAlertsRead}
                onMarkAllRead={handleMarkAllRead}
              />
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sync Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {syncStatus && syncStatus.syncs.length > 0 ? (
                      <div className="space-y-3">
                        {syncStatus.syncs.map((sync) => (
                          <div
                            key={sync.id}
                            className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(sync.started_at).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {sync.records_synced.toLocaleString()} records synced
                              </p>
                            </div>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs font-medium",
                                sync.status === "completed" && "bg-green-100 text-green-700",
                                sync.status === "running" && "bg-blue-100 text-blue-700",
                                sync.status === "failed" && "bg-red-100 text-red-700"
                              )}
                            >
                              {sync.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No sync history yet</p>
                    )}

                    <div className="mt-6 flex gap-3">
                      <Button onClick={() => handleSync("daily")} disabled={isSyncing}>
                        {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Run Daily Sync
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (
                            confirm(
                              "This will fetch up to 16 months of historical data. Continue?"
                            )
                          ) {
                            handleSync("backfill");
                          }
                        }}
                        disabled={isSyncing}
                      >
                        Backfill Historical Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Site URL</label>
                        <p className="mt-1 text-sm text-gray-500">sc-domain:domyhomework.co</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Data Retention</label>
                        <p className="mt-1 text-sm text-gray-500">
                          GSC provides up to 16 months of historical data
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
