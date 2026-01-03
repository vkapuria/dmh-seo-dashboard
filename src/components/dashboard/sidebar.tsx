"use client";

import { cn } from "@/lib/utils";
import {
  BarChart3,
  Search,
  FileText,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Star,
  TrendingUp,
} from "lucide-react";

type TabType = "overview" | "keywords" | "pages" | "alerts" | "insights" | "tracked" | "settings";

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  alertCount?: number;
  insightCount?: number;
  trackedCount?: number;
  insightPriority?: "critical" | "high" | "medium" | "low";
}

const navItems = [
  { id: "overview" as const, label: "Overview", icon: BarChart3 },
  { id: "keywords" as const, label: "Keywords", icon: Search },
  { id: "pages" as const, label: "Pages", icon: FileText },
  { id: "tracked" as const, label: "Tracked", icon: Star },
  { id: "insights" as const, label: "Insights", icon: Lightbulb },
  { id: "alerts" as const, label: "Alerts", icon: Bell },
  { id: "settings" as const, label: "Settings", icon: Settings },
];

export function Sidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  alertCount = 0,
  insightCount = 0,
  trackedCount = 0,
  insightPriority,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-[#0f0f1a] transition-all duration-300 flex flex-col",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-14 border-b border-gray-800 px-3",
        collapsed ? "justify-center" : "gap-3"
      )}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B35]">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <p className="text-sm font-bold text-white">DMH SEO</p>
            <p className="text-[10px] text-gray-500">Dashboard</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const showBadge = 
            (item.id === "alerts" && alertCount > 0) ||
            (item.id === "insights" && insightCount > 0) ||
            (item.id === "tracked" && trackedCount > 0);
          
          const badgeColor = item.id === "insights" && insightPriority === "critical"
            ? "bg-red-500"
            : item.id === "insights" && insightPriority === "high"
              ? "bg-orange-500"
              : item.id === "alerts"
                ? "bg-red-500"
                : "bg-[#FF6B35]";

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
                isActive
                  ? "bg-[#FF6B35] text-white"
                  : "text-gray-400 hover:bg-[#1a1a2e] hover:text-white",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-white")} />
              {!collapsed && (
                <>
                  <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                  {showBadge && (
                    <span className={cn(
                      "min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white",
                      badgeColor
                    )}>
                      {item.id === "alerts" ? alertCount : item.id === "insights" ? insightCount : trackedCount}
                    </span>
                  )}
                </>
              )}
              {collapsed && showBadge && (
                <span className={cn(
                  "absolute top-1 right-1 w-2 h-2 rounded-full",
                  badgeColor
                )} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-gray-800 p-2">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-[#1a1a2e] rounded-lg transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}