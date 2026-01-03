"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  format?: "number" | "percent" | "position";
  invertChange?: boolean;
}

export function MetricCard({ title, value, change, format = "number", invertChange = false }: MetricCardProps) {
  const formatValue = (val: number) => {
    if (format === "percent") return `${(val * 100).toFixed(2)}%`;
    if (format === "position") return val.toFixed(1);
    return val.toLocaleString();
  };

  const formatChange = (val: number) => {
    if (format === "percent") return `${(val * 100).toFixed(2)}%`;
    if (format === "position") return val.toFixed(1);
    return val.toLocaleString();
  };

  const isPositive = invertChange ? (change || 0) < 0 : (change || 0) > 0;
  const isNegative = invertChange ? (change || 0) > 0 : (change || 0) < 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{formatValue(value)}</p>
      {change !== undefined && (
        <div className={cn(
          "mt-1 flex items-center gap-1 text-sm font-medium",
          isPositive && "text-[#00C853]",
          isNegative && "text-[#FF5252]",
          !isPositive && !isNegative && "text-gray-400"
        )}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : isNegative ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          {change > 0 && "+"}{formatChange(change)}
        </div>
      )}
    </div>
  );
}

// Compact inline metrics row (Ahrefs style)
interface MetricItem {
  label: string;
  value: number;
  change?: number;
  format?: "number" | "percent" | "position";
  invertChange?: boolean;
}

interface MetricsRowProps {
  metrics: MetricItem[];
}

export function MetricsRow({ metrics }: MetricsRowProps) {
  const formatValue = (val: number, format: string = "number") => {
    if (format === "percent") return `${(val * 100).toFixed(2)}%`;
    if (format === "position") return val.toFixed(1);
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  const formatChange = (val: number, format: string = "number") => {
    if (format === "percent") return `${(val * 100).toFixed(2)}%`;
    if (format === "position") return val.toFixed(1);
    return val.toLocaleString();
  };

  return (
    <div className="flex items-center gap-0 rounded-lg border border-gray-200 bg-white overflow-hidden">
      {metrics.map((metric, idx) => {
        const isPositive = metric.invertChange ? (metric.change || 0) < 0 : (metric.change || 0) > 0;
        const isNegative = metric.invertChange ? (metric.change || 0) > 0 : (metric.change || 0) < 0;

        return (
          <div
            key={metric.label}
            className={cn(
              "flex-1 px-5 py-4",
              idx !== metrics.length - 1 && "border-r border-gray-200"
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{metric.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-gray-900 tabular-nums">
                {formatValue(metric.value, metric.format)}
              </span>
              {metric.change !== undefined && (
                <span className={cn(
                  "text-xs font-semibold tabular-nums",
                  isPositive && "text-[#00C853]",
                  isNegative && "text-[#FF5252]",
                  !isPositive && !isNegative && "text-gray-400"
                )}>
                  {metric.change > 0 && "+"}{formatChange(metric.change, metric.format)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}