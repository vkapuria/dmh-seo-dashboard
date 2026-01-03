"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

interface DailyMetric {
  date: string;
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
}

interface TrendChartProps {
  data: DailyMetric[];
  metric: "clicks" | "impressions" | "ctr" | "position";
  title: string;
}

export function TrendChart({ data, metric, title }: TrendChartProps) {
  const chartData = data.map((d) => ({
    date: d.date,
    value:
      metric === "clicks"
        ? d.total_clicks
        : metric === "impressions"
          ? d.total_impressions
          : metric === "ctr"
            ? Number(d.avg_ctr) * 100
            : Number(d.avg_position),
  }));

  const formatYAxis = (value: number) => {
    if (metric === "clicks" || metric === "impressions") {
      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
      return value.toString();
    }
    if (metric === "ctr") return `${value.toFixed(1)}%`;
    return value.toFixed(1);
  };

  const formatTooltip = (value: number) => {
    if (metric === "clicks" || metric === "impressions") return value.toLocaleString();
    if (metric === "ctr") return `${value.toFixed(2)}%`;
    return value.toFixed(1);
  };

  const lineColor =
    metric === "clicks"
      ? "#3b82f6"
      : metric === "impressions"
        ? "#8b5cf6"
        : metric === "ctr"
          ? "#10b981"
          : "#f59e0b";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(date) => format(parseISO(date), "MMM d")}
                stroke="#9ca3af"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={formatYAxis}
                stroke="#9ca3af"
                width={50}
                reversed={metric === "position"}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                labelFormatter={(date) => format(parseISO(date as string), "MMM d, yyyy")}
                formatter={(value: number | undefined) => [formatTooltip(value ?? 0), title]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Multi-line chart for overview
interface MultiTrendChartProps {
  data: DailyMetric[];
}

export function MultiTrendChart({ data }: MultiTrendChartProps) {
  const chartData = data.map((d) => ({
    date: d.date,
    clicks: d.total_clicks,
    impressions: d.total_impressions / 100, // Scale down for visibility
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Traffic Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(date) => format(parseISO(date), "MMM d")}
                stroke="#9ca3af"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" width={50} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                labelFormatter={(date) => format(parseISO(date as string), "MMM d, yyyy")}
                formatter={(value: number | undefined, name: string | undefined) => [
                  name === "impressions" ? Math.round((value ?? 0) * 100).toLocaleString() : (value ?? 0).toLocaleString(),
                  name === "impressions" ? "Impressions" : "Clicks",
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="clicks"
                name="Clicks"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="impressions"
                name="Impressions (÷100)"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
