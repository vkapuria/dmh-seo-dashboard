"use client";

import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Analytics01Icon,
  Search01Icon,
  File01Icon,
  Notification03Icon,
  Settings01Icon,
  StarIcon,
  Idea01Icon,
  ArrowReloadHorizontalIcon,
  Calendar03Icon,
  ArrowDown01Icon,
  Layers01Icon,
} from "@hugeicons/core-free-icons";

type TabType = "overview" | "keywords" | "pages" | "clusters" | "insights" | "tracked" | "alerts" | "settings";

interface TopNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  alertCount?: number;
  trackedCount?: number;
  insightsCount?: number;
  clustersCount?: number;
  days: number;
  onDaysChange: (days: number) => void;
  onSync: () => void;
  isSyncing: boolean;
}

const navItems = [
  { id: "overview" as const, label: "Overview", icon: Analytics01Icon },
  { id: "keywords" as const, label: "Keywords", icon: Search01Icon },
  { id: "pages" as const, label: "Pages", icon: File01Icon },
  { id: "clusters" as const, label: "Clusters", icon: Layers01Icon },
  { id: "insights" as const, label: "Insights", icon: Idea01Icon },
  { id: "tracked" as const, label: "Tracked", icon: StarIcon },
  { id: "alerts" as const, label: "Alerts", icon: Notification03Icon },
  { id: "settings" as const, label: "Settings", icon: Settings01Icon },
];

export function TopNav({
  activeTab,
  onTabChange,
  alertCount = 0,
  trackedCount = 0,
  insightsCount = 0,
  clustersCount = 0,
  days,
  onDaysChange,
  onSync,
  isSyncing,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      {/* Top Row: Logo & Controls */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-gray-100">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#E55A2B] shadow-sm">
            <span className="text-sm font-bold text-white">D</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 leading-tight">SEO Dashboard</span>
            <span className="text-[10px] text-gray-500">domyhomework.co</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Date Selector */}
          <DateSelector days={days} onDaysChange={onDaysChange} />

          {/* Sync Button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "bg-[#FF6B35] text-white hover:bg-[#E55A2B]",
              "disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            <HugeiconsIcon
              icon={ArrowReloadHorizontalIcon}
              size={16}
              className={cn(isSyncing && "animate-spin")}
            />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="flex items-center px-6 h-12 gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const badgeCount =
            item.id === "alerts" ? alertCount :
            item.id === "tracked" ? trackedCount :
            item.id === "insights" ? insightsCount :
            item.id === "clusters" ? clustersCount : 0;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative whitespace-nowrap",
                isActive
                  ? "bg-[#FF6B35]/10 text-[#FF6B35]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <HugeiconsIcon
                icon={item.icon}
                size={18}
                className={isActive ? "text-[#FF6B35]" : "text-gray-400"}
              />
              <span>{item.label}</span>
              {badgeCount > 0 && (
                <span
                  className={cn(
                    "flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold",
                    isActive
                      ? "bg-[#FF6B35] text-white"
                      : item.id === "insights"
                      ? "bg-purple-500 text-white"
                      : item.id === "clusters"
                      ? "bg-amber-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  )}
                >
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
              {/* Active indicator line */}
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#FF6B35] rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function DateSelector({
  days,
  onDaysChange,
}: {
  days: number;
  onDaysChange: (days: number) => void;
}) {
  const options = [
    { value: 7, label: "7 days" },
    { value: 28, label: "28 days" },
    { value: 90, label: "3 months" },
    { value: 180, label: "6 months" },
    { value: 365, label: "12 months" },
    { value: 480, label: "16 months" },
  ];

  return (
    <div className="relative">
      <select
        value={days}
        onChange={(e) => onDaysChange(Number(e.target.value))}
        className={cn(
          "appearance-none flex items-center gap-2 px-3 py-2 pr-8 rounded-lg text-sm font-medium",
          "bg-gray-50 border border-gray-200 text-gray-700",
          "hover:border-gray-300 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35]",
          "cursor-pointer transition-all"
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            Last {opt.label}
          </option>
        ))}
      </select>
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
    </div>
  );
}
