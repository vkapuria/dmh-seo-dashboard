"use client";

import { cn, formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  TradeUpIcon, 
  TradeDownIcon, 
  MinusSignIcon 
} from "@hugeicons/core-free-icons";

interface MetricCardProps {
  title: string;
  value: number;
  change: number;
  format?: "number" | "percent" | "position";
  invertChange?: boolean;
  compact?: boolean;
}

export function MetricCard({
  title,
  value,
  change,
  format = "number",
  invertChange = false,
  compact = false,
}: MetricCardProps) {
  const formattedValue =
    format === "percent"
      ? formatPercent(value)
      : format === "position"
        ? formatPosition(value)
        : formatNumber(value);

  const isPositive = invertChange ? change < 0 : change > 0;
  const isNegative = invertChange ? change > 0 : change < 0;
  const isNeutral = change === 0;

  const changeDisplay = Math.abs(change).toFixed(1);
  const changeLabel = format === "position" ? "" : "%";

  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">{title}</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900 tabular-nums">{formattedValue}</p>
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 text-xs font-semibold tabular-nums",
            isPositive && "text-[#00C853]",
            isNegative && "text-[#FF5252]",
            isNeutral && "text-gray-400"
          )}
        >
          {isPositive && <HugeiconsIcon icon={TradeUpIcon} size={14} />}
          {isNegative && <HugeiconsIcon icon={TradeDownIcon} size={14} />}
          {isNeutral && <HugeiconsIcon icon={MinusSignIcon} size={14} />}
          <span>{changeDisplay}{changeLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{formattedValue}</p>
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
            isPositive && "bg-green-50 text-[#00C853]",
            isNegative && "bg-red-50 text-[#FF5252]",
            isNeutral && "bg-gray-50 text-gray-500"
          )}
        >
          {isPositive && <HugeiconsIcon icon={TradeUpIcon} size={14} />}
          {isNegative && <HugeiconsIcon icon={TradeDownIcon} size={14} />}
          {isNeutral && <HugeiconsIcon icon={MinusSignIcon} size={14} />}
          <span>{change > 0 ? "+" : ""}{changeDisplay}{changeLabel}</span>
        </div>
      </div>
    </div>
  );
}

// Compact inline metrics row (Ahrefs style)
interface MetricsRowProps {
  metrics: {
    label: string;
    value: number;
    change?: number;
    format?: "number" | "percent" | "position";
    invertChange?: boolean;
  }[];
}

export function MetricsRow({ metrics }: MetricsRowProps) {
  return (
    <div className="flex items-center gap-6 rounded-lg border border-gray-200 bg-white px-5 py-3">
      {metrics.map((metric, idx) => {
        const formattedValue =
          metric.format === "percent"
            ? formatPercent(metric.value)
            : metric.format === "position"
              ? formatPosition(metric.value)
              : formatNumber(metric.value);

        const isPositive = metric.invertChange 
          ? (metric.change || 0) < 0 
          : (metric.change || 0) > 0;
        const isNegative = metric.invertChange 
          ? (metric.change || 0) > 0 
          : (metric.change || 0) < 0;

        return (
          <div key={idx} className="flex items-center gap-4">
            {idx > 0 && <div className="h-8 w-px bg-gray-200" />}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {metric.label}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-gray-900 tabular-nums">
                  {formattedValue}
                </span>
                {metric.change !== undefined && metric.change !== 0 && (
                  <span
                    className={cn(
                      "flex items-center text-xs font-semibold tabular-nums",
                      isPositive && "text-[#00C853]",
                      isNegative && "text-[#FF5252]"
                    )}
                  >
                    {isPositive && <HugeiconsIcon icon={TradeUpIcon} size={12} />}
                    {isNegative && <HugeiconsIcon icon={TradeDownIcon} size={12} />}
                    {Math.abs(metric.change).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}