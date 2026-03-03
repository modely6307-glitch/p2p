-- Create a table for AI Recommendation Caching
CREATE TABLE IF NOT EXISTS ai_recommendation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    country TEXT NOT NULL,
    date_key TEXT NOT NULL, -- Format: YYYY-MM-DD
    recommendation_data JSONB NOT NULL,
    user_preferences_hash TEXT, -- Optional: for basic personalization grouping
    
    -- Ensure we only have one "daily" default cache per country
    UNIQUE(country, date_key, user_preferences_hash)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_lookup ON ai_recommendation_cache (country, date_key);

-- Add comment
COMMENT ON TABLE ai_recommendation_cache IS 'Caches daily AI product recommendations to reduce LLM costs and improve performance.';
