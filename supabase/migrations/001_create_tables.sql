-- DMH SEO Dashboard Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Daily Metrics Table (Site-wide daily stats)
-- ============================================
CREATE TABLE IF NOT EXISTS seo_daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  avg_ctr DECIMAL(10, 6) NOT NULL DEFAULT 0,
  avg_position DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for date queries
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON seo_daily_metrics(date DESC);

-- ============================================
-- Keyword Rankings Table
-- ============================================
CREATE TABLE IF NOT EXISTS seo_keyword_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  query TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr DECIMAL(10, 6) NOT NULL DEFAULT 0,
  position DECIMAL(10, 2) NOT NULL DEFAULT 0,
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, query)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_date ON seo_keyword_rankings(date DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_query ON seo_keyword_rankings(query);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_clicks ON seo_keyword_rankings(clicks DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_position ON seo_keyword_rankings(position ASC);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_date_query ON seo_keyword_rankings(date, query);

-- ============================================
-- Page Performance Table
-- ============================================
CREATE TYPE page_type AS ENUM ('blog', 'tool', 'service', 'static', 'other');

CREATE TABLE IF NOT EXISTS seo_page_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  page_url TEXT NOT NULL,
  page_type page_type NOT NULL DEFAULT 'other',
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr DECIMAL(10, 6) NOT NULL DEFAULT 0,
  position DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, page_url)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_page_performance_date ON seo_page_performance(date DESC);
CREATE INDEX IF NOT EXISTS idx_page_performance_url ON seo_page_performance(page_url);
CREATE INDEX IF NOT EXISTS idx_page_performance_type ON seo_page_performance(page_type);
CREATE INDEX IF NOT EXISTS idx_page_performance_clicks ON seo_page_performance(clicks DESC);
CREATE INDEX IF NOT EXISTS idx_page_performance_date_type ON seo_page_performance(date, page_type);

-- ============================================
-- Alerts Table
-- ============================================
CREATE TYPE alert_type AS ENUM (
  'position_drop', 
  'position_gain', 
  'traffic_spike', 
  'traffic_drop', 
  'new_keyword', 
  'lost_keyword'
);

CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');

CREATE TABLE IF NOT EXISTS seo_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type alert_type NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_created ON seo_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON seo_alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON seo_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON seo_alerts(is_read) WHERE is_read = FALSE;

-- ============================================
-- Sync Logs Table
-- ============================================
CREATE TYPE sync_status AS ENUM ('running', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS seo_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status sync_status NOT NULL DEFAULT 'running',
  records_synced INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

-- Index for latest sync
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON seo_sync_logs(started_at DESC);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to determine page type from URL
CREATE OR REPLACE FUNCTION get_page_type(url TEXT)
RETURNS page_type AS $$
BEGIN
  IF url LIKE '%/blog/%' THEN
    RETURN 'blog';
  ELSIF url LIKE '%/tools/%' THEN
    RETURN 'tool';
  ELSIF url LIKE '%assignment-help%' OR url LIKE '%homework%' OR url LIKE '%essay%' THEN
    RETURN 'service';
  ELSIF url = 'https://domyhomework.co/' OR url LIKE '%/contact%' OR url LIKE '%/about%' OR url LIKE '%/faq%' OR url LIKE '%/privacy%' OR url LIKE '%/terms%' THEN
    RETURN 'static';
  ELSE
    RETURN 'other';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Views for Dashboard Queries
-- ============================================

-- Latest metrics comparison (today vs 7 days ago)
CREATE OR REPLACE VIEW v_metrics_comparison AS
SELECT 
  m1.date as current_date,
  m1.total_clicks as current_clicks,
  m1.total_impressions as current_impressions,
  m1.avg_ctr as current_ctr,
  m1.avg_position as current_position,
  m2.total_clicks as previous_clicks,
  m2.total_impressions as previous_impressions,
  m2.avg_ctr as previous_ctr,
  m2.avg_position as previous_position
FROM seo_daily_metrics m1
LEFT JOIN seo_daily_metrics m2 ON m2.date = m1.date - INTERVAL '7 days'
ORDER BY m1.date DESC
LIMIT 1;

-- Top gaining keywords (position improved)
CREATE OR REPLACE VIEW v_top_gainers AS
SELECT 
  k1.query,
  k1.clicks as current_clicks,
  k1.impressions as current_impressions,
  k1.position as current_position,
  k2.position as previous_position,
  (k2.position - k1.position) as position_gain
FROM seo_keyword_rankings k1
JOIN seo_keyword_rankings k2 
  ON k1.query = k2.query 
  AND k2.date = k1.date - INTERVAL '7 days'
WHERE k1.date = (SELECT MAX(date) FROM seo_keyword_rankings)
  AND k2.position > k1.position
ORDER BY position_gain DESC
LIMIT 20;

-- Top losing keywords (position dropped)
CREATE OR REPLACE VIEW v_top_losers AS
SELECT 
  k1.query,
  k1.clicks as current_clicks,
  k1.impressions as current_impressions,
  k1.position as current_position,
  k2.position as previous_position,
  (k1.position - k2.position) as position_loss
FROM seo_keyword_rankings k1
JOIN seo_keyword_rankings k2 
  ON k1.query = k2.query 
  AND k2.date = k1.date - INTERVAL '7 days'
WHERE k1.date = (SELECT MAX(date) FROM seo_keyword_rankings)
  AND k1.position > k2.position
ORDER BY position_loss DESC
LIMIT 20;

-- Performance by page type
CREATE OR REPLACE VIEW v_performance_by_type AS
SELECT 
  page_type,
  SUM(clicks) as total_clicks,
  SUM(impressions) as total_impressions,
  AVG(ctr) as avg_ctr,
  AVG(position) as avg_position,
  COUNT(DISTINCT page_url) as page_count
FROM seo_page_performance
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY page_type
ORDER BY total_clicks DESC;

-- ============================================
-- Row Level Security (Optional - skip if single user)
-- ============================================
-- ALTER TABLE seo_daily_metrics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE seo_keyword_rankings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE seo_page_performance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE seo_alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE seo_sync_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Grant permissions for anon and service_role
-- ============================================
GRANT ALL ON seo_daily_metrics TO anon, authenticated, service_role;
GRANT ALL ON seo_keyword_rankings TO anon, authenticated, service_role;
GRANT ALL ON seo_page_performance TO anon, authenticated, service_role;
GRANT ALL ON seo_alerts TO anon, authenticated, service_role;
GRANT ALL ON seo_sync_logs TO anon, authenticated, service_role;

GRANT SELECT ON v_metrics_comparison TO anon, authenticated, service_role;
GRANT SELECT ON v_top_gainers TO anon, authenticated, service_role;
GRANT SELECT ON v_top_losers TO anon, authenticated, service_role;
GRANT SELECT ON v_performance_by_type TO anon, authenticated, service_role;
