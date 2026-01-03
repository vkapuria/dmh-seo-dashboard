export type PageType = "blog" | "tool" | "service" | "static" | "other";
export type AlertType = "position_drop" | "position_gain" | "traffic_spike" | "traffic_drop" | "new_keyword" | "lost_keyword";
export type AlertSeverity = "info" | "warning" | "critical";

// Insight types
export type InsightCategory = "opportunity" | "threat" | "pattern" | "action";
export type InsightPriority = "critical" | "high" | "medium" | "low";
export type InsightStatus = "active" | "dismissed" | "resolved" | "expired";

export type InsightType =
  // Opportunities
  | "strike_distance_keyword"
  | "ctr_optimization_needed"
  | "rising_star_keyword"
  | "untapped_impressions"
  | "trending_topic"
  // Threats
  | "core_keyword_decline"
  | "homepage_keyword_drop"
  | "homepage_traffic_anomaly"
  | "cannibalization_detected"
  | "approaching_page_two"
  | "traffic_concentration_risk"
  // Patterns
  | "traffic_pattern_detected"
  | "content_type_winner"
  | "seasonal_trend"
  | "volatility_detected"
  // Actions
  | "quick_win_title_update"
  | "content_refresh_needed"
  | "internal_link_opportunity"
  | "keyword_cluster_gap";

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
      seo_insights: {
        Row: Insight;
        Insert: Omit<Insight, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Insight, "id" | "created_at" | "updated_at">>;
      };
      seo_homepage_snapshots: {
        Row: HomepageSnapshot;
        Insert: Omit<HomepageSnapshot, "id" | "created_at">;
        Update: Partial<Omit<HomepageSnapshot, "id" | "created_at">>;
      };
      seo_high_value_keywords: {
        Row: HighValueKeyword;
        Insert: Omit<HighValueKeyword, "id" | "first_seen_at" | "last_updated_at">;
        Update: Partial<Omit<HighValueKeyword, "id" | "first_seen_at">>;
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

// Insight interfaces
export interface InsightEvidence {
  metric: string;
  value: number | string;
  comparison?: number | string;
  change?: number;
  label?: string;
}

export interface InsightAffectedItem {
  type: "keyword" | "page";
  value: string;
  url?: string;
  metrics?: Record<string, number>;
}

export interface InsightImpactEstimate {
  clicks?: number;
  traffic_percent?: number;
  impressions?: number;
  description?: string;
}

export interface Insight {
  id: string;
  category: InsightCategory;
  type: InsightType;
  priority: InsightPriority;
  status: InsightStatus;
  title: string;
  description: string;
  suggested_action: string | null;
  evidence: InsightEvidence[];
  affected_items: InsightAffectedItem[];
  impact_estimate: InsightImpactEstimate | null;
  confidence_score: number;
  is_homepage_related: boolean;
  is_high_value_keyword: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  dismissed_at: string | null;
  resolved_at: string | null;
  data_date: string;
  generation_batch_id: string | null;
}

export interface HomepageSnapshot {
  id: string;
  date: string;
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
  keywords_page_one: number;
  keywords_page_two: number;
  keywords_page_three_plus: number;
  total_keywords: number;
  clicks_7d_avg: number | null;
  clicks_30d_avg: number | null;
  position_trend: number | null;
  created_at: string;
}

export interface HighValueKeyword {
  id: string;
  query: string;
  is_brand_keyword: boolean;
  is_core_keyword: boolean;
  meets_clicks_threshold: boolean;
  meets_impressions_threshold: boolean;
  is_rising_star: boolean;
  is_manually_flagged: boolean;
  latest_position: number | null;
  latest_clicks_28d: number | null;
  latest_impressions_28d: number | null;
  position_trend: number | null;
  first_seen_at: string;
  last_updated_at: string;
  ranking_page_url: string | null;
}

// Homepage health (from view)
export interface HomepageHealth {
  date: string;
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
  keywords_page_one: number;
  keywords_page_two: number;
  keywords_page_three_plus: number;
  total_keywords: number;
  clicks_7d_avg: number | null;
  clicks_30d_avg: number | null;
  position_trend: number | null;
  prev_clicks: number | null;
  prev_impressions: number | null;
  prev_position: number | null;
  prev_keywords_page_one: number | null;
}

// Keyword at risk (from view)
export interface KeywordAtRisk {
  query: string;
  latest_position: number;
  latest_clicks_28d: number;
  position_trend: number;
  ranking_page_url: string | null;
  keyword_type: "brand" | "core" | "traffic";
}

// Traffic keyword watchlist item (frontend type)
export interface WatchlistKeyword {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  positionChange: number;
  trend: "up" | "down" | "stable";
  status: "needs_attention" | "growing" | "stable" | "untapped";
  pageUrl: string | null;
  isHomepage: boolean;
  potentialClicks?: number;
}
