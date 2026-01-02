"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn, formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number;
  change: number;
  format?: "number" | "percent" | "position";
  invertChange?: boolean; // For position, lower is better
}

export function MetricCard({
  title,
  value,
  change,
  format = "number",
  invertChange = false,
}: MetricCardProps) {
  const formattedValue =
    format === "percent"
      ? formatPercent(value)
      : format === "position"
        ? formatPosition(value)
        : formatNumber(value);

  // Determine if change is positive/negative
  // For position, negative change (lower number) is good
  const isPositive = invertChange ? change > 0 : change > 0;
  const isNegative = invertChange ? change < 0 : change < 0;
  const isNeutral = change === 0;

  const changeDisplay = Math.abs(change).toFixed(1);
  const changeLabel = format === "position" ? " pos" : "%";

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{formattedValue}</p>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium",
              isPositive && "bg-green-100 text-green-700",
              isNegative && "bg-red-100 text-red-700",
              isNeutral && "bg-gray-100 text-gray-600"
            )}
          >
            {isPositive && <TrendingUp className="h-4 w-4" />}
            {isNegative && <TrendingDown className="h-4 w-4" />}
            {isNeutral && <Minus className="h-4 w-4" />}
            <span>
              {isPositive ? "+" : isNegative ? "-" : ""}
              {changeDisplay}
              {changeLabel}
            </span>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">vs previous period</p>
      </CardContent>
    </Card>
  );
}
