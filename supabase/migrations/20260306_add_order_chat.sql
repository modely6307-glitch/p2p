-- 1. Create the order_messages table
CREATE TABLE IF NOT EXISTS public.order_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Allow any authenticated user to read messages (for simplicity in this MVP, you can tighten this later to only buyer/traveler/admin)
CREATE POLICY "Enable read access for authenticated users" 
ON public.order_messages FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert their own messages
CREATE POLICY "Enable insert for authenticated users" 
ON public.order_messages FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 4. Enable Realtime!
-- Adds the table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
