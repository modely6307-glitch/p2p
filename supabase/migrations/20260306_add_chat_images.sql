-- 1. Add image_url column to order_messages and allow content to be null if an image is sent
ALTER TABLE public.order_messages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.order_messages ALTER COLUMN content DROP NOT NULL;

-- 2. Create Storage Bucket for chat images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_images', 'chat_images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies for chat_images (Public read, authenticated upload)
CREATE POLICY "Public Access for Chat Images" ON storage.objects FOR SELECT USING (bucket_id = 'chat_images');
CREATE POLICY "Auth Upload Chat Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat_images' AND auth.role() = 'authenticated');
