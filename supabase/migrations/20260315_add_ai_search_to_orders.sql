-- Add AI Search columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS ai_search_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS ai_search_results JSONB;
