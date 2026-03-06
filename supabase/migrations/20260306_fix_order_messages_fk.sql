-- Drop the existing foreign key linking user_id to auth.users
ALTER TABLE public.order_messages 
DROP CONSTRAINT IF EXISTS order_messages_user_id_fkey;

-- Add a new foreign key linking user_id to public.profiles instead
-- This allows Supabase API to successfully join order_messages with profiles
ALTER TABLE public.order_messages 
ADD CONSTRAINT order_messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
