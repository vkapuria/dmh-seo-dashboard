-- SEO Insights Table Migration
-- Stores AI-generated insights from keyword and page analysis

-- ============================================
-- Insight Types
-- ============================================
CREATE TYPE insight_type AS ENUM ('opportunity', 'threat', 'pattern', 'action');
CREATE TYPE insight_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE insight_category AS ENUM ('keyword', 'page', 'technical', 'content');
CREATE TYPE insight_status AS ENUM ('active', 'dismissed', 'completed', 'expired');

-- ============================================
-- SEO Insights Table
-- ============================================
CREATE TABLE IF NOT EXISTS seo_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Classification
  type insight_type NOT NULL,
  priority insight_priority NOT NULL DEFAULT 'medium',
  category insight_category NOT NULL,

  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_action TEXT,

  -- Evidence & Context
  evidence JSONB NOT NULL DEFAULT '[]',
  affected_items JSONB NOT NULL DEFAULT '[]',

  -- Impact & Confidence
  impact_estimate JSONB DEFAULT NULL,
  confidence_score DECIMAL(3, 2) DEFAULT 0.80,

  -- Status & Lifecycle
  status insight_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- For deduplication
  insight_key TEXT NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Unique constraint to prevent duplicate insights
CREATE UNIQUE INDEX IF NOT EXISTS idx_insights_unique_key
ON seo_insights(insight_key)
WHERE status = 'active';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_insights_created ON seo_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_type ON seo_insights(type);
CREATE INDEX IF NOT EXISTS idx_insights_priority ON seo_insights(priority);
CREATE INDEX IF NOT EXISTS idx_insights_category ON seo_insights(category);
CREATE INDEX IF NOT EXISTS idx_insights_status ON seo_insights(status);
CREATE INDEX IF NOT EXISTS idx_insights_active ON seo_insights(status, priority) WHERE status = 'active';

-- ============================================
-- Insight History Table (for tracking changes)
-- ============================================
CREATE TABLE IF NOT EXISTS seo_insight_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  insight_id UUID NOT NULL REFERENCES seo_insights(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL,
  previous_data JSONB,
  new_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_insight_history_insight ON seo_insight_history(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_history_created ON seo_insight_history(created_at DESC);

-- ============================================
-- Derived Metrics Table (for trend analysis)
-- ============================================
CREATE TABLE IF NOT EXISTS seo_keyword_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  date DATE NOT NULL,

  -- Rolling averages
  position_7d_avg DECIMAL(10, 2),
  position_30d_avg DECIMAL(10, 2),
  clicks_7d_avg DECIMAL(10, 2),
  impressions_7d_avg DECIMAL(10, 2),

  -- Trend coefficients (slope of linear regression)
  position_trend_7d DECIMAL(10, 4),
  position_trend_30d DECIMAL(10, 4),

  -- Volatility (standard deviation)
  position_volatility_7d DECIMAL(10, 2),
  position_volatility_30d DECIMAL(10, 2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(query, date)
);

CREATE INDEX IF NOT EXISTS idx_keyword_metrics_query ON seo_keyword_metrics(query);
CREATE INDEX IF NOT EXISTS idx_keyword_metrics_date ON seo_keyword_metrics(date DESC);

-- ============================================
-- Grant Permissions
-- ============================================
GRANT ALL ON seo_insights TO anon, authenticated, service_role;
GRANT ALL ON seo_insight_history TO anon, authenticated, service_role;
GRANT ALL ON seo_keyword_metrics TO anon, authenticated, service_role;
