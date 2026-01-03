"use client";

import { cn, formatNumber, formatPercent, formatPosition } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GlobalIcon,
  SmartPhone01Icon,
  ComputerIcon,
  Tablet01Icon,
} from "@hugeicons/core-free-icons";

interface CountryData {
  code: string;
  name: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface DeviceData {
  device: string;
  label: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface DimensionFiltersProps {
  countries: CountryData[];
  devices: DeviceData[];
  selectedCountry: string;
  selectedDevice: string;
  onCountryChange: (country: string) => void;
  onDeviceChange: (device: string) => void;
}

const deviceIcons: Record<string, any> = {
  MOBILE: SmartPhone01Icon,
  DESKTOP: ComputerIcon,
  TABLET: Tablet01Icon,
};

export function DimensionFilters({
  countries,
  devices,
  selectedCountry,
  selectedDevice,
  onCountryChange,
  onDeviceChange,
}: DimensionFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Country Filter */}
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={GlobalIcon} size={16} className="text-gray-400" />
        <select
          value={selectedCountry}
          onChange={(e) => onCountryChange(e.target.value)}
          className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm focus:border-[#FF6B35] focus:outline-none"
        >
          <option value="">All Countries</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({formatNumber(c.clicks)})
            </option>
          ))}
        </select>
      </div>

      {/* Device Filter */}
      <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        <button
          onClick={() => onDeviceChange("")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
            selectedDevice === ""
              ? "bg-[#FF6B35] text-white"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          All
        </button>
        {devices.map((d) => {
          const Icon = deviceIcons[d.device] || ComputerIcon;
          return (
            <button
              key={d.device}
              onClick={() => onDeviceChange(d.device)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                selectedDevice === d.device
                  ? "bg-[#FF6B35] text-white"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <HugeiconsIcon icon={Icon} size={14} />
              {d.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Country breakdown card
export function CountryBreakdown({ countries }: { countries: CountryData[] }) {
  const totalClicks = countries.reduce((sum, c) => sum + c.clicks, 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={GlobalIcon} size={14} className="text-gray-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">
            Traffic by Country
          </h3>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {countries.slice(0, 10).map((country, idx) => {
          const percentage = totalClicks > 0 ? (country.clicks / totalClicks) * 100 : 0;
          return (
            <div key={country.code} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{idx + 1}</span>
                  <span className="font-medium text-gray-900">{country.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-500">{formatNumber(country.clicks)} clicks</span>
                  <span className="text-gray-400 w-12 text-right">{percentage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF6B35] rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Device breakdown card
export function DeviceBreakdown({ devices }: { devices: DeviceData[] }) {
  const totalClicks = devices.reduce((sum, d) => sum + d.clicks, 0);

  const deviceColors: Record<string, string> = {
    MOBILE: "bg-blue-500",
    DESKTOP: "bg-emerald-500",
    TABLET: "bg-purple-500",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">
          Traffic by Device
        </h3>
      </div>
      <div className="p-4">
        {/* Stacked bar */}
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
          {devices.map((d) => {
            const percentage = totalClicks > 0 ? (d.clicks / totalClicks) * 100 : 0;
            return (
              <div
                key={d.device}
                className={cn("h-full transition-all", deviceColors[d.device] || "bg-gray-400")}
                style={{ width: `${percentage}%` }}
                title={`${d.label}: ${percentage.toFixed(1)}%`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          {devices.map((d) => {
            const Icon = deviceIcons[d.device] || ComputerIcon;
            const percentage = totalClicks > 0 ? (d.clicks / totalClicks) * 100 : 0;
            return (
              <div key={d.device} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className={cn("w-2 h-2 rounded-full", deviceColors[d.device])} />
                  <HugeiconsIcon icon={Icon} size={16} className="text-gray-500" />
                </div>
                <p className="text-lg font-bold text-gray-900 tabular-nums">{percentage.toFixed(0)}%</p>
                <p className="text-xs text-gray-500">{d.label}</p>
                <p className="text-xs text-gray-400 tabular-nums">{formatNumber(d.clicks)} clicks</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}