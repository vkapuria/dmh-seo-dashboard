import { google } from "googleapis";
import type { GSCSearchAnalyticsResponse, GSCSearchAnalyticsRow } from "@/types/database";

// Initialize the Search Console API client
function getSearchConsoleClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GSC_CLIENT_EMAIL,
      private_key: process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      project_id: process.env.GSC_PROJECT_ID,
    },
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });

  return google.searchconsole({ version: "v1", auth });
}

const SITE_URL = process.env.GSC_SITE_URL || "sc-domain:domyhomework.co";

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export type Dimension = "query" | "page" | "country" | "device" | "date";

export interface CountryMetric {
  date: string;
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface DeviceMetric {
  date: string;
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface KeywordByCountry {
  date: string;
  query: string;
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  page_url: string | null;
}

export interface KeywordByDevice {
  date: string;
  query: string;
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  page_url: string | null;
}

interface FetchOptions {
  dateRange: DateRange;
  dimensions: Dimension[];
  rowLimit?: number;
  startRow?: number;
}

// Fetch search analytics data from GSC
export async function fetchSearchAnalytics(
  options: FetchOptions
): Promise<GSCSearchAnalyticsRow[]> {
  const client = getSearchConsoleClient();
  const { dateRange, dimensions, rowLimit = 25000, startRow = 0 } = options;

  try {
    const response = await client.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        dimensions,
        rowLimit,
        startRow,
      },
    });

    const data = response.data as GSCSearchAnalyticsResponse;
    return data.rows || [];
  } catch (error) {
    console.error("GSC API Error:", error);
    throw error;
  }
}

// Fetch daily metrics (site-wide totals)
export async function fetchDailyMetrics(dateRange: DateRange): Promise<
  Array<{
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>
> {
  const rows = await fetchSearchAnalytics({
    dateRange,
    dimensions: ["date"],
    rowLimit: 500,
  });

  return rows.map((row) => ({
    date: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

// Fetch keyword rankings
export async function fetchKeywordRankings(
  dateRange: DateRange,
  limit = 25000
): Promise<
  Array<{
    date: string;
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    pageUrl: string | null;
  }>
> {
  // Fetch with query + page + date dimensions
  const rows = await fetchSearchAnalytics({
    dateRange,
    dimensions: ["date", "query", "page"],
    rowLimit: limit,
  });

  return rows.map((row) => ({
    date: row.keys[0],
    query: row.keys[1],
    pageUrl: row.keys[2] || null,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

// Fetch page performance
export async function fetchPagePerformance(
  dateRange: DateRange,
  limit = 25000
): Promise<
  Array<{
    date: string;
    pageUrl: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>
> {
  const rows = await fetchSearchAnalytics({
    dateRange,
    dimensions: ["date", "page"],
    rowLimit: limit,
  });

  return rows.map((row) => ({
    date: row.keys[0],
    pageUrl: row.keys[1],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

// Helper to get date range for last N days
export function getDateRange(days: number): DateRange {
  const endDate = new Date();
  // GSC data has 2-day delay
  endDate.setDate(endDate.getDate() - 2);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

// Get date range for backfill (16 months max)
export function getBackfillDateRange(): DateRange {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 2);

  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - 16);

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

// Fetch metrics by country
export async function fetchMetricsByCountry(
  startDate: string,
  endDate: string
): Promise<CountryMetric[]> {
  const client = getSearchConsoleClient();
  
  const response = await client.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["date", "country"],
      rowLimit: 25000,
    },
  });

  return (response.data.rows || []).map((row: any) => ({
    date: row.keys[0],
    country: row.keys[1],
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}

// Fetch metrics by device
export async function fetchMetricsByDevice(
  startDate: string,
  endDate: string
): Promise<DeviceMetric[]> {
  const client = getSearchConsoleClient();
  
  const response = await client.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["date", "device"],
      rowLimit: 25000,
    },
  });

  return (response.data.rows || []).map((row: any) => ({
    date: row.keys[0],
    device: row.keys[1],
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}

// Fetch keywords by country
export async function fetchKeywordsByCountry(
  startDate: string,
  endDate: string,
  country?: string
): Promise<KeywordByCountry[]> {
  const client = getSearchConsoleClient();
  
  const requestBody: any = {
    startDate,
    endDate,
    dimensions: ["date", "query", "country", "page"],
    rowLimit: 25000,
  };

  if (country) {
    requestBody.dimensionFilterGroups = [{
      filters: [{
        dimension: "country",
        operator: "equals",
        expression: country,
      }],
    }];
  }

  const response = await client.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody,
  });

  return (response.data.rows || []).map((row: any) => ({
    date: row.keys[0],
    query: row.keys[1],
    country: row.keys[2],
    page_url: row.keys[3] || null,
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}

// Fetch keywords by device
export async function fetchKeywordsByDevice(
  startDate: string,
  endDate: string,
  device?: string
): Promise<KeywordByDevice[]> {
  const client = getSearchConsoleClient();
  
  const requestBody: any = {
    startDate,
    endDate,
    dimensions: ["date", "query", "device", "page"],
    rowLimit: 25000,
  };

  if (device) {
    requestBody.dimensionFilterGroups = [{
      filters: [{
        dimension: "device",
        operator: "equals",
        expression: device,
      }],
    }];
  }

  const response = await client.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody,
  });

  return (response.data.rows || []).map((row: any) => ({
    date: row.keys[0],
    query: row.keys[1],
    device: row.keys[2],
    page_url: row.keys[3] || null,
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}
