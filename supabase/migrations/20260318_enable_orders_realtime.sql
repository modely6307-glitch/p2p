-- Enable Supabase Realtime for the orders table
-- Required for client-side postgres_changes subscriptions to receive ORDER UPDATE events

-- Add orders table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Set REPLICA IDENTITY FULL so UPDATE events include the complete new row,
-- not just the primary key (default behavior)
ALTER TABLE public.orders REPLICA IDENTITY FULL;
