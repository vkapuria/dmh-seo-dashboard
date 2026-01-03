"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MetricCard, MetricsRow } from "@/components/dashboard/metric-card";
import { TrendChart, MultiTrendChart } from "@/components/dashboard/trend-chart";
import { KeywordsTable, CompactKeywordList } from "@/components/dashboard/keywords-table";
import { PagesTable, TypeBreakdown } from "@/components/dashboard/pages-table";
import { AlertsList, AlertSummary } from "@/components/dashboard/alerts-list";
import {
  HomepageHealth,
  TrafficWatchlist,
  InsightsList,
} from "@/components/dashboard/insights";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RefreshCw,
  Search,
  Loader2,
  Calendar,
} from "lucide-react";
import type { Insight, InsightCategory, InsightPriority } from "@/types/database";
import { cn } from "@/lib/utils";

type TabType = "overview" | "keywords" | "pages" | "alerts" | "insights" | "tracked" | "settings";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [days, setDays] = useState(28);
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

  // Quick filters
  const [brandFilter, setBrandFilter] = useState<"all" | "brand" | "non-brand">("all");
  const [quickFilter, setQuickFilter] = useState<"" | "striking" | "zero-click">("");

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
      if (brandFilter !== "all") params.set("brand", brandFilter);
      if (quickFilter) params.set("filter", quickFilter);

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
  }, [keywordSearch, keywordPageType, keywordPageFilter, keywordCompareDays, keywordSortBy, keywordSortOrder, brandFilter, quickFilter]);

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
  }, [keywordSearch, keywordPageType, keywordPageFilter, keywordCompareDays, brandFilter, quickFilter, activeTab, isLoading, fetchKeywords]);

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
              summary: { ...prev.summary, total: prev.summary.total - 1 },
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
              summary: { ...prev.summary, total: prev.summary.total - 1 },
            }
          : null
      );
    } catch (error) {
      console.error("Error resolving insight:", error);
    }
  };

  // Get insight priority for badge color
  const getInsightPriority = (): "critical" | "high" | "medium" | "low" | undefined => {
    if (!insights) return undefined;
    if (insights.summary.byPriority.critical > 0) return "critical";
    if (insights.summary.byPriority.high > 0) return "high";
    return "medium";
  };

  const tabTitles: Record<TabType, string> = {
    overview: "Overview",
    keywords: "Keywords",
    pages: "Pages",
    tracked: "Tracked Keywords",
    insights: "Insights",
    alerts: "Alerts",
    settings: "Settings",
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        alertCount={alerts?.unreadCounts.total || 0}
        insightCount={insights?.summary.total || 0}
        insightPriority={getInsightPriority()}
      />

      {/* Main content */}
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "ml-14" : "ml-56"
      )}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h1 className="text-lg font-bold text-gray-900">{tabTitles[activeTab]}</h1>
          
          <div className="flex items-center gap-3">
            {/* Date range selector */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Calendar className="h-4 w-4 text-gray-400 ml-2" />
              {[7, 28, 90, 180, 365].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    days === d
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {d === 7 ? "7d" : d === 28 ? "28d" : d === 90 ? "3m" : d === 180 ? "6m" : "1y"}
                </button>
              ))}
            </div>

            {/* Sync button */}
            <button
              onClick={() => handleSync("daily")}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-white text-sm font-medium rounded-lg hover:bg-[#E55A2B] disabled:opacity-50 transition-colors"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {isLoading ? (
            <div className="flex h-96 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === "overview" && metrics && (
                <div className="space-y-6 animate-fade-in">
                  {/* Homepage Health & Traffic Watchlist */}
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

                  {/* Metrics Row */}
                  <MetricsRow
                    metrics={[
                      { label: "Clicks", value: metrics.summary.clicks, change: metrics.summary.clicksChange },
                      { label: "Impressions", value: metrics.summary.impressions, change: metrics.summary.impressionsChange },
                      { label: "CTR", value: metrics.summary.ctr, change: metrics.summary.ctrChange, format: "percent" },
                      { label: "Position", value: metrics.summary.position, change: metrics.summary.positionChange, format: "position", invertChange: true },
                    ]}
                  />

                  {/* Charts */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <MultiTrendChart data={metrics.daily} />
                    <TrendChart data={metrics.daily} metric="position" title="Average Position" />
                  </div>

                  {/* Keyword highlights */}
                  {keywords && (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      <CompactKeywordList keywords={keywords.gainers} title="Top Gainers" type="gainers" />
                      <CompactKeywordList keywords={keywords.losers} title="Top Losers" type="losers" />
                      <CompactKeywordList keywords={keywords.newKeywords} title="New Rankings" type="new" />
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
                <div className="space-y-4 animate-fade-in">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search keywords..."
                        value={keywordSearch}
                        onChange={(e) => setKeywordSearch(e.target.value)}
                        className="w-full h-9 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-1 focus:ring-[#FF6B35]"
                      />
                    </div>

                    {/* Page Type */}
                    <select
                      value={keywordPageType}
                      onChange={(e) => {
                        setKeywordPageType(e.target.value);
                        setKeywordPageFilter("");
                      }}
                      className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm focus:border-[#FF6B35] focus:outline-none"
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

                    {/* Specific Page */}
                    {keywordPageType && (
                      <select
                        value={keywordPageFilter}
                        onChange={(e) => setKeywordPageFilter(e.target.value)}
                        className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm focus:border-[#FF6B35] focus:outline-none max-w-[200px]"
                      >
                        <option value="">All {keywords.pageTypeLabels?.[keywordPageType]}</option>
                        {keywords.pagesByType?.[keywordPageType]?.map((page) => (
                          <option key={page} value={page}>
                            {page.replace("https://domyhomework.co", "") || "/"}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Divider */}
                    <div className="h-6 w-px bg-gray-200" />

                    {/* Brand Filter */}
                    <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                      {(["all", "brand", "non-brand"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setBrandFilter(opt)}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                            brandFilter === opt
                              ? "bg-gray-700 text-white"
                              : "text-gray-600 hover:text-gray-900"
                          )}
                        >
                          {opt === "all" ? "All" : opt === "brand" ? "Brand" : "Non-Brand"}
                        </button>
                      ))}
                    </div>

                    {/* Quick Filters */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuickFilter(quickFilter === "striking" ? "" : "striking")}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                          quickFilter === "striking"
                            ? "bg-[#FF6B35] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        Striking Distance
                      </button>
                      <button
                        onClick={() => setQuickFilter(quickFilter === "zero-click" ? "" : "zero-click")}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                          quickFilter === "zero-click"
                            ? "bg-[#FF6B35] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        Zero-Click
                      </button>
                    </div>

                    {/* Compare Period */}
                    <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                      {[7, 14, 28].map((d) => (
                        <button
                          key={d}
                          onClick={() => setKeywordCompareDays(d)}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                            keywordCompareDays === d
                              ? "bg-[#1A73E8] text-white"
                              : "text-gray-600 hover:text-gray-900"
                          )}
                        >
                          vs {d}d
                        </button>
                      ))}
                    </div>

                    {/* Clear */}
                    {(keywordSearch || keywordPageType || brandFilter !== "all" || quickFilter) && (
                      <button
                        onClick={() => {
                          setKeywordSearch("");
                          setKeywordPageType("");
                          setKeywordPageFilter("");
                          setBrandFilter("all");
                          setQuickFilter("");
                        }}
                        className="text-xs text-[#FF6B35] hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Results count */}
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-gray-500">
                      {isKeywordsLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        <>
                          <span className="font-semibold text-gray-700">{keywords.keywords.length}</span> keywords
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="text-gray-400">{keywords.currentPeriodStart} to {keywords.currentPeriodEnd}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Keywords Table */}
                  <KeywordsTable
                    keywords={keywords.keywords}
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
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
                    <select
                      value={pagesTypeFilter}
                      onChange={(e) => setPagesTypeFilter(e.target.value)}
                      className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm focus:border-[#FF6B35] focus:outline-none"
                    >
                      <option value="">All Types</option>
                      {Object.entries(pages.pageTypeLabels || {}).map(([type, label]) => (
                        <option key={type} value={type}>{label}</option>
                      ))}
                    </select>
                    {pagesTypeFilter && (
                      <button
                        onClick={() => setPagesTypeFilter("")}
                        className="text-xs text-[#FF6B35] hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <TypeBreakdown data={pages.performanceByType} pageTypeLabels={pages.pageTypeLabels} />
                  <PagesTable
                    pages={pagesTypeFilter ? pages.pages.filter(p => p.page_type === pagesTypeFilter) : pages.pages}
                    title="All Pages"
                    pageTypeLabels={pages.pageTypeLabels}
                  />
                </div>
              )}

              {/* Tracked Tab - Placeholder */}
              {activeTab === "tracked" && (
                <div className="animate-fade-in">
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-gray-500">Tracked keywords feature coming soon...</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Insights Tab */}
              {activeTab === "insights" && insights && (
                <div className="space-y-6 animate-fade-in">
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
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      {insights.summary.homepage} Homepage-related
                    </span>
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                      {insights.summary.highValue} High-value Keywords
                    </span>
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                      {insights.summary.byPriority.critical} Critical
                    </span>
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                      {insights.summary.byPriority.high} High Priority
                    </span>
                  </div>

                  <InsightsList
                    insights={insights.insights}
                    onDismiss={handleInsightDismiss}
                    onResolve={handleInsightResolve}
                  />
                </div>
              )}

              {/* Alerts Tab */}
              {activeTab === "alerts" && alerts && (
                <div className="animate-fade-in">
                  <AlertsList
                    alerts={alerts.alerts}
                    onMarkRead={handleMarkAlertsRead}
                    onMarkAllRead={handleMarkAllRead}
                  />
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <div className="space-y-6 animate-fade-in">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sync Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {syncStatus && syncStatus.syncs.length > 0 ? (
                        <div className="space-y-3">
                          {syncStatus.syncs.map((sync) => (
                            <div key={sync.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {new Date(sync.started_at).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {sync.records_synced.toLocaleString()} records
                                </p>
                              </div>
                              <span className={cn(
                                "rounded-full px-2.5 py-1 text-xs font-medium",
                                sync.status === "completed" && "bg-green-100 text-green-700",
                                sync.status === "running" && "bg-blue-100 text-blue-700",
                                sync.status === "failed" && "bg-red-100 text-red-700"
                              )}>
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
                          {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Run Daily Sync
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (confirm("This will fetch up to 16 months of historical data. Continue?")) {
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
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}