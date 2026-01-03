"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart,
  LineChart, // Added back for the single trend chart
  Line,
  Bar,
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

// -- Custom Tooltip Component --
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-xl ring-1 ring-black/5">
        <p className="mb-2 text-xs font-medium text-gray-500">
          {format(parseISO(label as string), "EEE, MMM d, yyyy")}
        </p>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center gap-3 text-sm">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="w-24 text-gray-600 capitalize">{entry.name}:</span>
              <span className="font-semibold text-gray-900 tabular-nums">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// -- Multi-Metric Chart (Bars + Line) --
interface MultiTrendChartProps {
  data: DailyMetric[];
}

export function MultiTrendChart({ data }: MultiTrendChartProps) {
  return (
    <Card className="border border-gray-200 shadow-none">
      <CardHeader className="border-b border-gray-100 px-6 py-4">
        <CardTitle className="text-sm font-medium text-gray-900">Traffic Performance</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickFormatter={(date) => format(parseISO(date), "MMM d")}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
                dy={10}
              />
              
              {/* Left Axis: Clicks (Bars) */}
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => 
                  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
                }
              />

              {/* Right Axis: Impressions (Line) */}
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => 
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                }
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />
              <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }} />

              <Bar
                yAxisId="left"
                dataKey="total_clicks"
                name="Clicks"
                fill="#2563eb"
                barSize={20}
                radius={[4, 4, 0, 0]}
              />

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="total_impressions"
                name="Impressions"
                stroke="#e11d48"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "#e11d48" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// -- Single Metric Chart (Position/CTR) --
export function TrendChart({ data, metric, title }: any) {
  const chartData = data.map((d: any) => ({
    date: d.date,
    value: metric === "ctr" ? Number(d.avg_ctr) * 100 : Number(d.avg_position),
  }));

  const color = metric === "ctr" ? "#10b981" : "#f59e0b"; // Emerald or Amber

  return (
    <Card className="border border-gray-200 shadow-none">
      <CardHeader className="border-b border-gray-100 px-6 py-4">
        <CardTitle className="text-sm font-medium text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickFormatter={(date) => format(parseISO(date), "MMM d")}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                reversed={metric === "position"} // Rank 1 is top
                domain={['auto', 'auto']}
              />
              <Tooltip 
                cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg text-xs">
                        <span className="font-semibold text-gray-900">
                          {Number(payload[0].value).toFixed(1)}
                          {metric === "ctr" ? "%" : ""}
                        </span>
                        <span className="ml-2 text-gray-500">{format(parseISO(label as string), "MMM d")}</span>
                      </div>
                    )
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}