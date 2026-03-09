-- Migration to track individual rating status in orders
-- Use this to support group buy rating tracking

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rated_by_buyer BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rated_by_traveler BOOLEAN DEFAULT FALSE;
