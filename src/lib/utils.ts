import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}

export function formatPercent(num: number): string {
  return (num * 100).toFixed(2) + "%";
}

export function formatPosition(num: number): string {
  return num.toFixed(1);
}

export function getChangeIndicator(current: number, previous: number): {
  direction: "up" | "down" | "neutral";
  value: number;
  percent: number;
} {
  if (previous === 0) {
    return { direction: "neutral", value: 0, percent: 0 };
  }
  const diff = current - previous;
  const percent = ((current - previous) / previous) * 100;
  
  return {
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
    value: Math.abs(diff),
    percent: Math.abs(percent),
  };
}

// For position, lower is better
export function getPositionChangeIndicator(current: number, previous: number): {
  direction: "up" | "down" | "neutral";
  value: number;
} {
  if (previous === 0) {
    return { direction: "neutral", value: 0 };
  }
  const diff = previous - current; // Reversed: lower position is better
  
  return {
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
    value: Math.abs(diff),
  };
}
