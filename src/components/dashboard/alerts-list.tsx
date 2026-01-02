"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Bell,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Alert, AlertType, AlertSeverity } from "@/types/database";

interface AlertsListProps {
  alerts: Alert[];
  onMarkRead?: (ids: string[]) => void;
  onMarkAllRead?: () => void;
}

const alertTypeConfig: Record<
  AlertType,
  { icon: typeof TrendingUp; color: string; bgColor: string }
> = {
  position_gain: {
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  position_drop: {
    icon: TrendingDown,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  traffic_spike: {
    icon: TrendingUp,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  traffic_drop: {
    icon: TrendingDown,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  new_keyword: {
    icon: Sparkles,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  lost_keyword: {
    icon: X,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
};

const severityConfig: Record<
  AlertSeverity,
  { icon: typeof AlertTriangle; color: string; label: string }
> = {
  critical: {
    icon: AlertTriangle,
    color: "text-red-600 bg-red-100",
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600 bg-amber-100",
    label: "Warning",
  },
  info: {
    icon: Info,
    color: "text-blue-600 bg-blue-100",
    label: "Info",
  },
};

export function AlertsList({ alerts, onMarkRead, onMarkAllRead }: AlertsListProps) {
  const unreadAlerts = alerts.filter((a) => !a.is_read);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Bell className="h-4 w-4" />
          Alerts
          {unreadAlerts.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {unreadAlerts.length} new
            </span>
          )}
        </CardTitle>
        {unreadAlerts.length > 0 && onMarkAllRead && (
          <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
            <CheckCircle className="mr-1 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {alerts.map((alert) => {
            const typeConfig = alertTypeConfig[alert.type];
            const sevConfig = severityConfig[alert.severity];
            const Icon = typeConfig.icon;

            return (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg p-3 transition-colors",
                  typeConfig.bgColor,
                  alert.is_read && "opacity-60"
                )}
              >
                <div className={cn("mt-0.5", typeConfig.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
                        sevConfig.color
                      )}
                    >
                      {sevConfig.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(parseISO(alert.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900">{alert.message}</p>
                </div>
                {!alert.is_read && onMarkRead && (
                  <button
                    onClick={() => onMarkRead([alert.id])}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {alerts.length === 0 && (
          <div className="py-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-300" />
            <p className="mt-2 text-gray-500">No alerts - everything looks good!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Alert summary badges for header
interface AlertSummaryProps {
  counts: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
}

export function AlertSummary({ counts }: AlertSummaryProps) {
  if (counts.total === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {counts.critical > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-sm font-medium text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          {counts.critical}
        </span>
      )}
      {counts.warning > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-medium text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          {counts.warning}
        </span>
      )}
      {counts.info > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-sm font-medium text-blue-700">
          <Info className="h-3.5 w-3.5" />
          {counts.info}
        </span>
      )}
    </div>
  );
}
