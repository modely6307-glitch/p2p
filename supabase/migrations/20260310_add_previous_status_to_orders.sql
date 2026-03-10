ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS previous_status TEXT;
COMMENT ON COLUMN public.orders.previous_status IS '進入 DISPUTE 前的訂單狀態，用於裁決後的狀態回溯';
