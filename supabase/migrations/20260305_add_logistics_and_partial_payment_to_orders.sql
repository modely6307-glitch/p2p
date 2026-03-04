-- Migration to add logistics and partial payment columns to orders table
-- Version 1.3.0

-- 1. Infrastructure columns (ensure these exist if they were missed)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_platform_fee NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS traveler_platform_fee NUMERIC DEFAULT 0;

-- 2. Logistics columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_method TEXT DEFAULT 'HOME'; -- 'HOME' or '711'
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cvs_store_info JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recipient_phone TEXT;

-- 3. Partial Payment columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_partial_payment BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deposit_percentage INTEGER;

-- 4. Settings table for global parameters
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    buyer_fee_threshold NUMERIC DEFAULT 1000,
    buyer_fee_fixed_amount NUMERIC DEFAULT 20,
    buyer_fee_percentage NUMERIC DEFAULT 2,
    traveler_fee_threshold NUMERIC DEFAULT 1000,
    traveler_fee_fixed_amount NUMERIC DEFAULT 20,
    traveler_fee_percentage NUMERIC DEFAULT 2,
    deposit_threshold_days INTEGER DEFAULT 30,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default settings if not exists
INSERT INTO public.settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;
