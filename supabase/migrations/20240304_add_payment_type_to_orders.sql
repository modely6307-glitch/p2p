-- Add payment_type to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'MATCH_ESCROW';
-- Types: 'PRE_ESCROW' (Pay at post) | 'MATCH_ESCROW' (Pay after match)
