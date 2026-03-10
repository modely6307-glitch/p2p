-- Add columns to track last read message for buyer and traveler
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS traveler_last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index to order_messages for better PERFORMANCE if needed
CREATE INDEX IF NOT EXISTS idx_order_messages_order_id_created_at ON public.order_messages(order_id, created_at);
