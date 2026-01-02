export type PageType = "blog" | "tool" | "service" | "static" | "other";
export type AlertType = "position_drop" | "position_gain" | "traffic_spike" | "traffic_drop" | "new_keyword" | "lost_keyword";
export type AlertSeverity = "info" | "warning" | "critical";

export interface DailyMetrics {
  id: string;
  date: string;
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
  created_at: string;
}

export interface KeywordRanking {
  id: string;
  date: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  page_url: string | null;
  created_at: string;
}

export interface PagePerformance {
  id: string;
  date: string;
  page_url: string;
  page_type: PageType;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  created_at: string;
}

export interface Alert {
  id: string;
  created_at: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
}

export interface SyncLog {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: "running" | "completed" | "failed";
  records_synced: number;
  error_message: string | null;
}

// Database schema type for Supabase
export interface Database {
  public: {
    Tables: {
      seo_daily_metrics: {
        Row: DailyMetrics;
        Insert: Omit<DailyMetrics, "id" | "created_at">;
        Update: Partial<Omit<DailyMetrics, "id" | "created_at">>;
      };
      seo_keyword_rankings: {
        Row: KeywordRanking;
        Insert: Omit<KeywordRanking, "id" | "created_at">;
        Update: Partial<Omit<KeywordRanking, "id" | "created_at">>;
      };
      seo_page_performance: {
        Row: PagePerformance;
        Insert: Omit<PagePerformance, "id" | "created_at">;
        Update: Partial<Omit<PagePerformance, "id" | "created_at">>;
      };
      seo_alerts: {
        Row: Alert;
        Insert: Omit<Alert, "id" | "created_at">;
        Update: Partial<Omit<Alert, "id" | "created_at">>;
      };
      seo_sync_logs: {
        Row: SyncLog;
        Insert: Omit<SyncLog, "id">;
        Update: Partial<Omit<SyncLog, "id">>;
      };
    };
  };
}

// API Response types
export interface GSCSearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCSearchAnalyticsResponse {
  rows: GSCSearchAnalyticsRow[];
  responseAggregationType: string;
}

// Dashboard aggregation types
export interface MetricsSummary {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  clicksChange: number;
  impressionsChange: number;
  ctrChange: number;
  positionChange: number;
}

export interface TopKeyword {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  positionChange: number;
}

export interface TopPage {
  url: string;
  pageType: PageType;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface PerformanceByType {
  type: PageType;
  clicks: number;
  impressions: number;
  avgCtr: number;
  avgPosition: number;
  pageCount: number;
}
