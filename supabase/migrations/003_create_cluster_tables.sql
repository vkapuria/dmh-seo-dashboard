-- Migration: Create cluster tables for keyword clustering & content gap analysis
-- This migration adds support for:
-- 1. Raw keyword-page relationships (before aggregation)
-- 2. Keyword clusters (semantic groupings)
-- 3. Cluster membership tracking
-- 4. Cluster-specific insights

-- ============================================
-- Table 1: Raw keyword-page rankings
-- Stores all keyword-page pairs before aggregation
-- ============================================
CREATE TABLE IF NOT EXISTS seo_keyword_page_rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  query TEXT NOT NULL,
  page_url TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr DECIMAL(10,6) NOT NULL DEFAULT 0,
  position DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, query, page_url)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_kw_page_rankings_date ON seo_keyword_page_rankings(date DESC);
CREATE INDEX IF NOT EXISTS idx_kw_page_rankings_query ON seo_keyword_page_rankings(query);
CREATE INDEX IF NOT EXISTS idx_kw_page_rankings_page ON seo_keyword_page_rankings(page_url);
CREATE INDEX IF NOT EXISTS idx_kw_page_rankings_date_query ON seo_keyword_page_rankings(date, query);
CREATE INDEX IF NOT EXISTS idx_kw_page_rankings_date_page ON seo_keyword_page_rankings(date, page_url);

-- ============================================
-- Table 2: Keyword clusters
-- Stores cluster definitions and metadata
-- ============================================
CREATE TYPE cluster_type AS ENUM ('root_term', 'page_based', 'semantic');

CREATE TABLE IF NOT EXISTS seo_keyword_clusters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_name TEXT NOT NULL,
  cluster_type cluster_type NOT NULL,
  root_term TEXT,                    -- For root_term clusters: the common stem
  primary_page_url TEXT,             -- For page_based clusters: the main page
  keyword_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clusters_type ON seo_keyword_clusters(cluster_type);
CREATE INDEX IF NOT EXISTS idx_clusters_active ON seo_keyword_clusters(is_active);
CREATE INDEX IF NOT EXISTS idx_clusters_root_term ON seo_keyword_clusters(root_term) WHERE root_term IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clusters_page ON seo_keyword_clusters(primary_page_url) WHERE primary_page_url IS NOT NULL;

-- ============================================
-- Table 3: Cluster keyword membership
-- Maps keywords to their clusters
-- ============================================
CREATE TABLE IF NOT EXISTS seo_cluster_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES seo_keyword_clusters(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,  -- Is this the primary/representative keyword?
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cluster_id, query)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cluster_kw_cluster ON seo_cluster_keywords(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_kw_query ON seo_cluster_keywords(query);

-- ============================================
-- Table 4: Cluster insights
-- Stores cluster-specific intelligence
-- ============================================
CREATE TYPE cluster_insight_type AS ENUM (
  'content_gap',      -- Missing keyword variations
  'weak_link',        -- Underperforming keywords in strong clusters
  'authority_score',  -- Topic authority changes
  'cannibalization',  -- Multiple pages competing
  'coverage_decline'  -- Losing keyword breadth
);

CREATE TABLE IF NOT EXISTS seo_cluster_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES seo_keyword_clusters(id) ON DELETE CASCADE,
  insight_type cluster_insight_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_action TEXT,
  evidence JSONB DEFAULT '[]'::jsonb,
  affected_items JSONB DEFAULT '[]'::jsonb,
  priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  confidence_score DECIMAL(3,2) DEFAULT 0.80,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'completed', 'expired')),
  insight_key TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cluster_insights_cluster ON seo_cluster_insights(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_insights_type ON seo_cluster_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_cluster_insights_status ON seo_cluster_insights(status);
CREATE INDEX IF NOT EXISTS idx_cluster_insights_priority ON seo_cluster_insights(priority);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cluster_insights_unique_key
  ON seo_cluster_insights(insight_key) WHERE status = 'active';

-- ============================================
-- Helper function to update cluster keyword counts
-- ============================================
CREATE OR REPLACE FUNCTION update_cluster_keyword_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE seo_keyword_clusters
    SET keyword_count = keyword_count + 1, updated_at = NOW()
    WHERE id = NEW.cluster_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE seo_keyword_clusters
    SET keyword_count = keyword_count - 1, updated_at = NOW()
    WHERE id = OLD.cluster_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update keyword counts
DROP TRIGGER IF EXISTS trigger_update_cluster_count ON seo_cluster_keywords;
CREATE TRIGGER trigger_update_cluster_count
AFTER INSERT OR DELETE ON seo_cluster_keywords
FOR EACH ROW EXECUTE FUNCTION update_cluster_keyword_count();

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE seo_keyword_page_rankings IS 'Raw keyword-page pairs from GSC before aggregation. Enables multi-page relationship analysis.';
COMMENT ON TABLE seo_keyword_clusters IS 'Keyword cluster definitions. Groups related keywords by root term, page, or semantic similarity.';
COMMENT ON TABLE seo_cluster_keywords IS 'Maps keywords to clusters. A keyword can belong to multiple clusters of different types.';
COMMENT ON TABLE seo_cluster_insights IS 'Cluster-specific insights including content gaps, weak links, and authority scores.';
