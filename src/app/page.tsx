"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MetricCard, MetricsRow } from "@/components/dashboard/metric-card";
import { TrendChart, MultiTrendChart } from "@/components/dashboard/trend-chart";
import { KeywordsTable, CompactKeywordList } from "@/components/dashboard/keywords-table";
import { PagesTable, TypeBreakdown } from "@/components/dashboard/pages-table";
import { TrackedKeywordsTable } from "@/components/dashboard/tracked-keywords";
import { AlertsList, AlertSummary } from "@/components/dashboard/alerts-list";
import { DimensionFilters, CountryBreakdown, DeviceBreakdown } from "@/components/dashboard/dimension-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  ArrowReloadHorizontalIcon,
  Calendar03Icon,
  ArrowDown01Icon,
  Loading03Icon,
  FilterIcon,
  Analytics01Icon,
  File01Icon,
  Notification01Icon,
  Settings01Icon,
  Notification03Icon
} from "@hugeicons/core-free-icons";

type TabType = "overview" | "keywords" | "pages" | "tracked" | "alerts" | "settings";


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

export default function Dashboard() {
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // -- UI STATE --
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [days, setDays] = useState(28);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [brandFilter, setBrandFilter] = useState<"all" | "brand" | "non-brand">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Tracked keywords state
  const [trackedKeywords, setTrackedKeywords] = useState<any[]>([]);
  const [trackedKeywordsSet, setTrackedKeywordsSet] = useState<Set<string>>(new Set());
  const [isTrackedLoading, setIsTrackedLoading] = useState(false);

  // -- FILTER STATE (Keywords) --
  const [keywordSearch, setKeywordSearch] = useState("");
  const [keywordPageType, setKeywordPageType] = useState("");
  const [keywordPageFilter, setKeywordPageFilter] = useState("");
  const [keywordCompareDays, setKeywordCompareDays] = useState(7);
  const [keywordSortBy, setKeywordSortBy] = useState("clicks");
  const [keywordSortOrder, setKeywordSortOrder] = useState<"asc" | "desc">("desc");
  const [isKeywordsLoading, setIsKeywordsLoading] = useState(false);
  const [quickFilter, setQuickFilter] = useState<"all" | "striking" | "zero-click" | "cannibalized">("all");

  // -- FILTER STATE (Pages) --
  const [pagesTypeFilter, setPagesTypeFilter] = useState("");

  // -- DATA STATE --
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [keywords, setKeywords] = useState<KeywordsData | null>(null);
  const [pages, setPages] = useState<PagesData | null>(null);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncData | null>(null);
  const [dimensions, setDimensions] = useState<{
    countries: any[];
    devices: any[];
  } | null>(null);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");

  // -- DATA FETCHING --

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
      if (selectedCountry) params.set("country", selectedCountry);
      if (selectedDevice) params.set("device", selectedDevice);

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
  }, [keywordSearch, keywordPageType, keywordPageFilter, keywordCompareDays, keywordSortBy, keywordSortOrder, selectedCountry, selectedDevice]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [metricsRes, keywordsRes, pagesRes, alertsRes, syncRes] = await Promise.all([
        fetch(`/api/metrics?days=${days}`),
        fetch(`/api/keywords?compareDays=7&limit=500`),
        fetch(`/api/pages?days=${days}&limit=50`),
        fetch(`/api/alerts?limit=50`),
        fetch(`/api/sync`),
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (keywordsRes.ok) setKeywords(await keywordsRes.json());
      if (pagesRes.ok) setPages(await pagesRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (syncRes.ok) setSyncStatus(await syncRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  const fetchTrackedKeywords = useCallback(async () => {
    setIsTrackedLoading(true);
    try {
      const res = await fetch(`/api/tracked-keywords?days=${days}&history=true`);
      if (res.ok) {
        const data = await res.json();
        setTrackedKeywords(data.tracked || []);
        // Build set for quick lookup
        const set = new Set<string>();
        (data.tracked || []).forEach((tk: any) => {
          set.add(`${tk.query}|${tk.page_url}`);
        });
        setTrackedKeywordsSet(set);
      }
    } catch (error) {
      console.error("Error fetching tracked keywords:", error);
    } finally {
      setIsTrackedLoading(false);
    }
  }, [days]);

  const fetchDimensions = useCallback(async () => {
    try {
      const res = await fetch(`/api/dimensions?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setDimensions({
          countries: data.countries || [],
          devices: data.devices || [],
        });
      }
    } catch (error) {
      console.error("Error fetching dimensions:", error);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchTrackedKeywords();
  }, [fetchTrackedKeywords]);

  useEffect(() => {
    fetchDimensions();
  }, [fetchDimensions]);

  useEffect(() => {
    if (!isLoading && activeTab === "keywords") {
      fetchKeywords();
    }
  }, [keywordSearch, keywordPageType, keywordPageFilter, keywordCompareDays, activeTab, isLoading, fetchKeywords, selectedCountry, selectedDevice]);

  useEffect(() => {
    const handleClickOutside = () => setShowDateMenu(false);
    if (showDateMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showDateMenu]);

  // -- FILTER LOGIC --
  // This computes the filtered list on the client side instantly
  const filteredKeywordsData = useMemo(() => {
    if (!keywords) return null;
    
    let filtered = [...keywords.keywords];

    // 1. Brand Filter
    if (brandFilter !== "all") {
      const isBrand = (q: string) => {
        const qLower = q.toLowerCase();
        return qLower.includes("domyhomework") || qLower.includes("dmh");
      };
      filtered = filtered.filter(k => brandFilter === "brand" ? isBrand(k.query) : !isBrand(k.query));
    }

    // 2. Quick Utility Filters (The "Pro" Features)
    if (quickFilter === "striking") {
      // Rank 11-20
      filtered = filtered.filter(k => k.position > 10 && k.position <= 20);
    } else if (quickFilter === "zero-click") {
      // High Impr (>1000) but Low CTR (<1%)
      filtered = filtered.filter(k => k.impressions > 1000 && k.ctr < 0.01);
    } else if (quickFilter === "cannibalized") {
      // Keywords where multiple DIFFERENT pages rank (requires aggregation logic not shown, 
      // but simplified: show keywords with position fluctuation > 5 places often implies this)
      // For now, let's stick to "Top 3" as a simple filter if cannibalization logic isn't backend-ready
      filtered = filtered.filter(k => k.position <= 3);
    }

    // Apply brand filter to other lists too
    const isBrand = (query: string) => {
      const q = query.toLowerCase();
      return q.includes("domyhomework") || q.includes("dmh");
    };
    const brandFilterFn = (item: KeywordItem) => 
      brandFilter === "all" ? true : (brandFilter === "brand" ? isBrand(item.query) : !isBrand(item.query));

    return {
      ...keywords,
      keywords: filtered,
      gainers: keywords.gainers.filter(brandFilterFn),
      losers: keywords.losers.filter(brandFilterFn),
      newKeywords: keywords.newKeywords.filter(brandFilterFn),
    };
  }, [keywords, brandFilter, quickFilter]);

  // -- HANDLERS --

  // When country changes, clear device
  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    if (country) setSelectedDevice(""); // Clear device when country is selected
  };

  // When device changes, clear country  
  const handleDeviceChange = (device: string) => {
    setSelectedDevice(device);
    if (device) setSelectedCountry(""); // Clear country when device is selected
  };

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

  const handleToggleTrack = async (query: string, page_url: string) => {
    const key = `${query}|${page_url}`;
    const isTracked = trackedKeywordsSet.has(key);

    try {
      if (isTracked) {
        // Untrack
        await fetch(`/api/tracked-keywords?query=${encodeURIComponent(query)}&page_url=${encodeURIComponent(page_url)}`, {
          method: "DELETE",
        });
        setTrackedKeywordsSet((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      } else {
        // Track
        await fetch("/api/tracked-keywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, page_url }),
        });
        setTrackedKeywordsSet((prev) => new Set(prev).add(key));
      }
      // Refresh tracked list
      fetchTrackedKeywords();
    } catch (error) {
      console.error("Error toggling track:", error);
    }
  };

  const handleUntrack = async (id: string) => {
    try {
      await fetch(`/api/tracked-keywords?id=${id}`, { method: "DELETE" });
      fetchTrackedKeywords();
    } catch (error) {
      console.error("Error untracking:", error);
    }
  };

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Analytics01Icon },
    { id: "keywords" as const, label: "Keywords", icon: Search01Icon },
    { id: "pages" as const, label: "Pages", icon: File01Icon },
    { id: "alerts" as const, label: "Alerts", icon: Notification03Icon },
    { id: "settings" as const, label: "Settings", icon: Settings01Icon },
  ];

  // -- RENDER --
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        alertCount={alerts?.unreadCounts.total || 0}
        trackedCount={trackedKeywords.length}
      />

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "ml-16" : "ml-56"
      )}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
          <div className="flex h-14 items-center justify-between px-6">
            {/* Left: Page Title */}
            <h1 className="text-lg font-semibold text-gray-900 capitalize">
              {activeTab}
            </h1>

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
              {/* Date Selector */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDateMenu(!showDateMenu); }}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <HugeiconsIcon icon={Calendar03Icon} size={16} className="text-gray-400" />
                  <span>Last {days}d</span>
                  <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="text-gray-400" />
                </button>
                
                {showDateMenu && (
                  <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50 animate-fade-in">
                    {[7, 28, 90, 180, 365, 480].map((d) => (
                      <button
                        key={d}
                        onClick={() => { setDays(d); setShowDateMenu(false); }}
                        className={cn(
                          "w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50",
                          days === d ? "bg-[#FF6B35]/10 text-[#FF6B35] font-medium" : "text-gray-700"
                        )}
                      >
                        {d <= 30 ? `${d} days` : d === 90 ? "3 months" : d === 180 ? "6 months" : d === 365 ? "12 months" : "16 months"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sync Button */}
              <Button
                onClick={() => handleSync("daily")}
                disabled={isSyncing}
                size="sm"
                className="h-9 gap-2 bg-[#FF6B35] hover:bg-[#E55A2B] text-white border-0"
              >
                <HugeiconsIcon
                  icon={ArrowReloadHorizontalIcon}
                  size={16}
                  className={isSyncing ? "animate-spin" : ""}
                />
                Sync
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {isLoading ? (
            <div className="flex h-96 flex-col items-center justify-center gap-3">
              <HugeiconsIcon icon={Loading03Icon} size={32} className="animate-spin text-[#FF6B35]" />
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === "overview" && metrics && (
                <div className="space-y-6 animate-fade-in">
                  {/* Metrics Row */}
                  <MetricsRow
                    metrics={[
                      { label: "Clicks", value: metrics.summary.clicks, change: metrics.summary.clicksChange },
                      { label: "Impressions", value: metrics.summary.impressions, change: metrics.summary.impressionsChange },
                      { label: "CTR", value: metrics.summary.ctr, change: metrics.summary.ctrChange, format: "percent" },
                      { label: "Position", value: metrics.summary.position, change: metrics.summary.positionChange, format: "position", invertChange: true },
                    ]}
                  />

                  {/* Country & Device Breakdown */}
                  {dimensions && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <CountryBreakdown countries={dimensions.countries} />
                      <DeviceBreakdown devices={dimensions.devices} />
                    </div>
                  )}

                  {/* Charts */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <MultiTrendChart data={metrics.daily} />
                    <TrendChart data={metrics.daily} metric="position" title="Average Position" />
                  </div>

                  {/* Tracked Keywords (if any) */}
                  {trackedKeywords.length > 0 && (
                    <TrackedKeywordsTable
                      keywords={trackedKeywords}
                      onUntrack={handleUntrack}
                      onViewDetails={(kw) => {
                        const params = new URLSearchParams({ q: kw.query, page: kw.page_url });
                        window.location.href = `/keyword?${params}`;
                      }}
                      isLoading={isTrackedLoading}
                    />
                  )}

                  {/* Gainers/Losers/New */}
                  {filteredKeywordsData && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <CompactKeywordList keywords={filteredKeywordsData.gainers} title="Top Gainers" type="gainers" />
                      <CompactKeywordList keywords={filteredKeywordsData.losers} title="Top Losers" type="losers" />
                      <CompactKeywordList keywords={filteredKeywordsData.newKeywords} title="New Rankings" type="new" />
                    </div>
                  )}

                  {/* Page Performance */}
                  {pages && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <TypeBreakdown data={pages.performanceByType} pageTypeLabels={pages.pageTypeLabels} />
                      <PagesTable pages={pages.pages.slice(0, 10)} title="Top Pages" pageTypeLabels={pages.pageTypeLabels} />
                    </div>
                  )}
                </div>
              )}

              {/* KEYWORDS TAB */}
              {activeTab === "keywords" && filteredKeywordsData && (
                <div className="space-y-4 animate-fade-in">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                      <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search keywords..."
                        value={keywordSearch}
                        onChange={(e) => setKeywordSearch(e.target.value)}
                        className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm focus:border-[#FF6B35] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#FF6B35]"
                      />
                    </div>

                    {/* Page Type Filter */}
                    <select
                      value={keywordPageType}
                      onChange={(e) => setKeywordPageType(e.target.value)}
                      className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm focus:border-[#FF6B35] focus:outline-none"
                    >
                      <option value="">All Page Types</option>
                      {Object.entries(filteredKeywordsData.pageTypeLabels || {}).map(([type, label]) => (
                        <option key={type} value={type}>{label}</option>
                      ))}
                    </select>

                    {/* Quick Filters */}
                    <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                      {[
                        { id: "all", label: "All" },
                        { id: "striking", label: "11-20" },
                        { id: "zero-click", label: "Low CTR" },
                      ].map((filter) => (
                        <button
                          key={filter.id}
                          onClick={() => setQuickFilter(filter.id as any)}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                            quickFilter === filter.id
                              ? "bg-[#FF6B35] text-white"
                              : "text-gray-600 hover:text-gray-900"
                          )}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    {/* Brand Filter */}
                    <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                      {[
                        { id: "all", label: "All" },
                        { id: "brand", label: "Brand" },
                        { id: "non-brand", label: "Non-Brand" },
                      ].map((filter) => (
                        <button
                          key={filter.id}
                          onClick={() => setBrandFilter(filter.id as any)}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                            brandFilter === filter.id
                              ? "bg-gray-900 text-white"
                              : "text-gray-600 hover:text-gray-900"
                          )}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    {/* Compare Period */}
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-xs text-gray-500 mr-2">vs</span>
                      {[7, 14, 28].map((d) => (
                        <button
                          key={d}
                          onClick={() => setKeywordCompareDays(d)}
                          className={cn(
                            "px-2 py-1 text-xs font-medium rounded transition-all",
                            keywordCompareDays === d
                              ? "bg-[#1A73E8] text-white"
                              : "text-gray-500 hover:bg-gray-100"
                          )}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>

                    {/* Dimension Filters */}
                    {dimensions && (
                      <DimensionFilters
                        countries={dimensions.countries}
                        devices={dimensions.devices}
                        selectedCountry={selectedCountry}
                        selectedDevice={selectedDevice}
                        onCountryChange={handleCountryChange}
                        onDeviceChange={handleDeviceChange}
                      />
                    )}
                  </div>

                  {/* Results Info */}
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-500">
                      <span className="font-semibold text-gray-900">{filteredKeywordsData.keywords.length}</span> keywords
                      {filteredKeywordsData.currentPeriodStart && (
                        <span className="ml-2 text-gray-400">
                          ({filteredKeywordsData.currentPeriodStart} → {filteredKeywordsData.currentPeriodEnd})
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Table */}
                  <KeywordsTable
                    keywords={filteredKeywordsData.keywords}
                    showUrl={true}
                    sortBy={keywordSortBy}
                    sortOrder={keywordSortOrder}
                    onSort={(col) => {
                      if (keywordSortBy === col) {
                        setKeywordSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                      } else {
                        setKeywordSortBy(col);
                        setKeywordSortOrder("desc");
                      }
                    }}
                    trackedKeywords={trackedKeywordsSet}
                    onToggleTrack={handleToggleTrack}
                  />
                </div>
              )}

              {/* PAGES TAB */}
              {activeTab === "pages" && pages && (
                <div className="space-y-4 animate-fade-in">
                  {/* Filter */}
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                    <HugeiconsIcon icon={FilterIcon} size={16} className="text-gray-400" />
                    <select
                      value={pagesTypeFilter}
                      onChange={(e) => setPagesTypeFilter(e.target.value)}
                      className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm focus:border-[#FF6B35] focus:outline-none"
                    >
                      <option value="">All Page Types</option>
                      {Object.entries(pages.pageTypeLabels || {}).map(([type, label]) => (
                        <option key={type} value={type}>{label}</option>
                      ))}
                    </select>
                    {pagesTypeFilter && (
                      <button
                        onClick={() => setPagesTypeFilter("")}
                        className="text-sm text-[#FF6B35] hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <TypeBreakdown data={pages.performanceByType} pageTypeLabels={pages.pageTypeLabels} />
                    <PagesTable
                      pages={pagesTypeFilter ? pages.pages.filter((p) => p.page_type === pagesTypeFilter) : pages.pages}
                      title="All Pages"
                      pageTypeLabels={pages.pageTypeLabels}
                    />
                  </div>
                </div>
              )}

              {/* TRACKED TAB */}
              {activeTab === "tracked" && (
                <div className="space-y-4 animate-fade-in">
                  <TrackedKeywordsTable
                    keywords={trackedKeywords}
                    onUntrack={handleUntrack}
                    onViewDetails={(kw) => {
                      const params = new URLSearchParams({ q: kw.query, page: kw.page_url });
                      window.location.href = `/keyword?${params}`;
                    }}
                    isLoading={isTrackedLoading}
                  />
                </div>
              )}

              {/* ALERTS TAB */}
              {activeTab === "alerts" && alerts && (
                <div className="animate-fade-in">
                  <AlertsList
                    alerts={alerts.alerts}
                    onMarkRead={handleMarkAlertsRead}
                    onMarkAllRead={handleMarkAllRead}
                  />
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <div className="space-y-6 animate-fade-in max-w-2xl">
                  {/* Sync Status Card */}
                  <Card className="border-gray-200">
                    <CardHeader className="border-b border-gray-100 pb-4">
                      <CardTitle className="text-sm font-semibold">Sync History</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {syncStatus && syncStatus.syncs.length > 0 ? (
                        <div className="space-y-2">
                          {syncStatus.syncs.map((sync) => (
                            <div
                              key={sync.id}
                              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm"
                            >
                              <div>
                                <span className="font-mono text-xs text-gray-500">
                                  {new Date(sync.started_at).toLocaleString()}
                                </span>
                                <span className="ml-3 font-medium text-gray-900">
                                  {sync.records_synced.toLocaleString()} records
                                </span>
                              </div>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                                  sync.status === "completed" && "bg-green-100 text-[#00C853]",
                                  sync.status === "running" && "bg-blue-100 text-[#1A73E8]",
                                  sync.status === "failed" && "bg-red-100 text-[#FF5252]"
                                )}
                              >
                                {sync.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No sync history</p>
                      )}

                      <div className="mt-6 flex gap-3">
                        <Button
                          onClick={() => handleSync("daily")}
                          disabled={isSyncing}
                          className="bg-[#FF6B35] hover:bg-[#E55A2B]"
                        >
                          {isSyncing && <HugeiconsIcon icon={Loading03Icon} size={16} className="mr-2 animate-spin" />}
                          Run Daily Sync
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (confirm("Fetch 16 months of data?")) handleSync("backfill");
                          }}
                          disabled={isSyncing}
                        >
                          Backfill Historical
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Config Card */}
                  <Card className="border-gray-200">
                    <CardHeader className="border-b border-gray-100 pb-4">
                      <CardTitle className="text-sm font-semibold">Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Site</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">sc-domain:domyhomework.co</p>
                        </div>
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Data Source</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">Google Search Console</p>
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
    </div>
  );
}