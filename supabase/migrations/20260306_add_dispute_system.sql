-- Migration to add dispute functionality
-- Version 1.4.0

-- 1. Add dispute columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_by_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_evidence_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_resolution TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMP WITH TIME ZONE;

-- 2. Create Storage Bucket for disputes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('disputes', 'disputes', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies for disputes (Enable public access for reading, Auth users can upload)
CREATE POLICY "Public Access for Disputes" ON storage.objects FOR SELECT USING (bucket_id = 'disputes');
CREATE POLICY "Auth Upload Disputes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'disputes' AND auth.role() = 'authenticated');
