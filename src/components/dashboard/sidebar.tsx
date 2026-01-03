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
  Menu01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

type TabType = "overview" | "keywords" | "pages" | "tracked" | "alerts" | "settings";

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  alertCount?: number;
  trackedCount?: number;
}

const navItems = [
  { id: "overview" as const, label: "Overview", icon: Analytics01Icon },
  { id: "keywords" as const, label: "Keywords", icon: Search01Icon },
  { id: "pages" as const, label: "Pages", icon: File01Icon },
  { id: "tracked" as const, label: "Tracked", icon: StarIcon },
  { id: "alerts" as const, label: "Alerts", icon: Notification03Icon },
  { id: "settings" as const, label: "Settings", icon: Settings01Icon },
];

export function Sidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  alertCount = 0,
  trackedCount = 0,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-[#0f0f1a] text-white transition-all duration-300 flex flex-col",
        isCollapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B35]">
              <span className="text-xs font-bold">DMH</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none">SEO Dashboard</span>
              <span className="text-[10px] text-gray-400">domyhomework.co</span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B35]">
            <span className="text-xs font-bold">D</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const showBadge = 
              (item.id === "alerts" && alertCount > 0) ||
              (item.id === "tracked" && trackedCount > 0);
            const badgeCount = item.id === "alerts" ? alertCount : trackedCount;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-[#FF6B35] text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <HugeiconsIcon
                    icon={item.icon}
                    size={20}
                    className={isActive ? "text-white" : "text-gray-500"}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {showBadge && (
                        <span className={cn(
                          "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                          isActive ? "bg-white/20 text-white" : "bg-[#FF6B35] text-white"
                        )}>
                          {badgeCount}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-white/10 p-2">
        <button
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <HugeiconsIcon
            icon={isCollapsed ? ArrowRight01Icon : Cancel01Icon}
            size={18}
          />
          {!isCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}