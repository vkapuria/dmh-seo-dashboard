-- DMH SEO Dashboard - Insights Schema
-- Migration 002: Create insights infrastructure

-- ============================================
-- Insight Types and Enums
-- ============================================

-- Insight category (what kind of insight)
CREATE TYPE insight_category AS ENUM (
  'opportunity',   -- Growth potential
  'threat',        -- Risk to monitor
  'pattern',       -- Trend/behavior detected
  'action'         -- Recommended action
);

-- Insight priority
CREATE TYPE insight_priority AS ENUM (
  'critical',
  'high',
  'medium',
  'low'
);

-- Insight status
CREATE TYPE insight_status AS ENUM (
  'active',        -- Currently relevant
  'dismissed',     -- User dismissed
  'resolved',      -- User marked as addressed
  'expired'        -- No longer relevant (auto)
);

-- Specific insight types
CREATE TYPE insight_type AS ENUM (
  -- Opportunities
  'strike_distance_keyword',      -- Position 11-20, high impressions
  'ctr_optimization_needed',      -- Low CTR vs expected for position
  'rising_star_keyword',          -- Rapidly improving position
  'untapped_impressions',         -- High impressions, low clicks
  'trending_topic',               -- New keyword gaining traction

  -- Threats
  'core_keyword_decline',         -- Top keyword losing position
  'homepage_keyword_drop',        -- Homepage keyword position drop
  'homepage_traffic_anomaly',     -- Unusual homepage traffic change
  'cannibalization_detected',     -- Multiple pages same keyword
  'approaching_page_two',         -- Position 8-10 declining
  'traffic_concentration_risk',   -- Too dependent on few keywords

  -- Patterns
  'traffic_pattern_detected',     -- Day/week patterns
  'content_type_winner',          -- Page type outperforming
  'seasonal_trend',               -- Seasonal pattern
  'volatility_detected',          -- High position variance

  -- Actions
  'quick_win_title_update',       -- Easy CTR improvement
  'content_refresh_needed',       -- Declining page needs update
  'internal_link_opportunity',    -- Link building opportunity
  'keyword_cluster_gap'           -- Missing related keywords
);

-- ============================================
-- Insights Table
-- ============================================
CREATE TABLE IF NOT EXISTS seo_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Classification
  category insight_category NOT NULL,
  type insight_type NOT NULL,
  priority insight_priority NOT NULL DEFAULT 'medium',
  status insight_status NOT NULL DEFAULT 'active',

  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_action TEXT,

  -- Evidence & context
  evidence JSONB NOT NULL DEFAULT '[]',        -- Array of data points
  affected_items JSONB NOT NULL DEFAULT '[]',  -- Keywords/pages affected

  -- Impact estimation
  impact_estimate JSONB DEFAULT NULL,  -- { clicks: number, traffic_percent: number }
  confidence_score DECIMAL(3, 2) DEFAULT 0.5,  -- 0.00 to 1.00

  -- Scope flags
  is_homepage_related BOOLEAN NOT NULL DEFAULT FALSE,
  is_high_value_keyword BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- When insight should be re-evaluated
  dismissed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  -- Tracking
  data_date DATE NOT NULL,  -- The date of data this insight is based on
  generation_batch_id UUID  -- To group insights from same sync
);

-- ============================================
-- Indexes for Insights
-- ============================================
CREATE INDEX IF NOT EXISTS idx_insights_category ON seo_insights(category);
CREATE INDEX IF NOT EXISTS idx_insights_type ON seo_insights(type);
CREATE INDEX IF NOT EXISTS idx_insights_priority ON seo_insights(priority);
CREATE INDEX IF NOT EXISTS idx_insights_status ON seo_insights(status);
CREATE INDEX IF NOT EXISTS idx_insights_created ON seo_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_homepage ON seo_insights(is_homepage_related) WHERE is_homepage_related = TRUE;
CREATE INDEX IF NOT EXISTS idx_insights_high_value ON seo_insights(is_high_value_keyword) WHERE is_high_value_keyword = TRUE;
CREATE INDEX IF NOT EXISTS idx_insights_active ON seo_insights(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_insights_data_date ON seo_insights(data_date DESC);

-- ============================================
-- Homepage Metrics Snapshot Table
-- Dedicated tracking for homepage performance
-- ============================================
CREATE TABLE IF NOT EXISTS seo_homepage_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,

  -- Core metrics
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  avg_ctr DECIMAL(10, 6) NOT NULL DEFAULT 0,
  avg_position DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Keyword distribution
  keywords_page_one INTEGER NOT NULL DEFAULT 0,      -- Position 1-10
  keywords_page_two INTEGER NOT NULL DEFAULT 0,      -- Position 11-20
  keywords_page_three_plus INTEGER NOT NULL DEFAULT 0, -- Position 21+
  total_keywords INTEGER NOT NULL DEFAULT 0,

  -- Derived metrics (calculated during sync)
  clicks_7d_avg DECIMAL(10, 2),     -- Rolling 7-day average
  clicks_30d_avg DECIMAL(10, 2),    -- Rolling 30-day average
  position_trend DECIMAL(10, 4),    -- Trend coefficient

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homepage_snapshots_date ON seo_homepage_snapshots(date DESC);

-- ============================================
-- High-Value Keywords Tracking Table
-- Keywords that drive significant traffic
-- ============================================
CREATE TABLE IF NOT EXISTS seo_high_value_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL UNIQUE,

  -- Classification
  is_brand_keyword BOOLEAN NOT NULL DEFAULT FALSE,
  is_core_keyword BOOLEAN NOT NULL DEFAULT FALSE,

  -- Thresholds met (why it's high-value)
  meets_clicks_threshold BOOLEAN NOT NULL DEFAULT FALSE,      -- >50 clicks/28d
  meets_impressions_threshold BOOLEAN NOT NULL DEFAULT FALSE, -- >1000 impressions/28d
  is_rising_star BOOLEAN NOT NULL DEFAULT FALSE,              -- Rapid improvement
  is_manually_flagged BOOLEAN NOT NULL DEFAULT FALSE,         -- User-flagged

  -- Latest stats (updated during sync)
  latest_position DECIMAL(10, 2),
  latest_clicks_28d INTEGER,
  latest_impressions_28d INTEGER,
  position_trend DECIMAL(10, 4),  -- Negative = improving, positive = declining

  -- Tracking
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ranking_page_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_high_value_keywords_query ON seo_high_value_keywords(query);
CREATE INDEX IF NOT EXISTS idx_high_value_keywords_brand ON seo_high_value_keywords(is_brand_keyword) WHERE is_brand_keyword = TRUE;
CREATE INDEX IF NOT EXISTS idx_high_value_keywords_core ON seo_high_value_keywords(is_core_keyword) WHERE is_core_keyword = TRUE;

-- ============================================
-- Views for Insights Dashboard
-- ============================================

-- Active insights summary by category
CREATE OR REPLACE VIEW v_insights_summary AS
SELECT
  category,
  priority,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_homepage_related) as homepage_count,
  COUNT(*) FILTER (WHERE is_high_value_keyword) as high_value_count
FROM seo_insights
WHERE status = 'active'
GROUP BY category, priority
ORDER BY
  CASE priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  category;

-- Homepage health view
CREATE OR REPLACE VIEW v_homepage_health AS
SELECT
  h.date,
  h.total_clicks,
  h.total_impressions,
  h.avg_ctr,
  h.avg_position,
  h.keywords_page_one,
  h.keywords_page_two,
  h.keywords_page_three_plus,
  h.total_keywords,
  h.clicks_7d_avg,
  h.clicks_30d_avg,
  h.position_trend,
  -- Compare to 7 days ago
  prev.total_clicks as prev_clicks,
  prev.total_impressions as prev_impressions,
  prev.avg_position as prev_position,
  prev.keywords_page_one as prev_keywords_page_one
FROM seo_homepage_snapshots h
LEFT JOIN seo_homepage_snapshots prev ON prev.date = h.date - INTERVAL '7 days'
ORDER BY h.date DESC
LIMIT 1;

-- High-value keywords at risk
CREATE OR REPLACE VIEW v_keywords_at_risk AS
SELECT
  hv.query,
  hv.latest_position,
  hv.latest_clicks_28d,
  hv.position_trend,
  hv.ranking_page_url,
  CASE
    WHEN hv.is_brand_keyword THEN 'brand'
    WHEN hv.is_core_keyword THEN 'core'
    ELSE 'traffic'
  END as keyword_type
FROM seo_high_value_keywords hv
WHERE hv.position_trend > 0  -- Position getting worse
  AND hv.latest_position <= 20  -- Still on page 1-2
ORDER BY
  hv.is_brand_keyword DESC,
  hv.is_core_keyword DESC,
  hv.latest_clicks_28d DESC;

-- ============================================
-- Trigger: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_insights_updated_at
  BEFORE UPDATE ON seo_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_insights_updated_at();

-- ============================================
-- Permissions
-- ============================================
GRANT ALL ON seo_insights TO anon, authenticated, service_role;
GRANT ALL ON seo_homepage_snapshots TO anon, authenticated, service_role;
GRANT ALL ON seo_high_value_keywords TO anon, authenticated, service_role;

GRANT SELECT ON v_insights_summary TO anon, authenticated, service_role;
GRANT SELECT ON v_homepage_health TO anon, authenticated, service_role;
GRANT SELECT ON v_keywords_at_risk TO anon, authenticated, service_role;
