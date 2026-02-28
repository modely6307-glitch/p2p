-- Create Storage Buckets
-- Run this in your Supabase SQL Editor

-- 1. wishes (for item photos when creating a wish)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wishes', 'wishes', true)
ON CONFLICT (id) DO NOTHING;

-- 2. receipts (for proof of purchase / receipts)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 3. purchase_photos (for actual item photos by traveler)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('purchase_photos', 'purchase_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up Storage Policies (Enable public access for reading)
CREATE POLICY "Public Access for Wishes" ON storage.objects FOR SELECT USING (bucket_id = 'wishes');
CREATE POLICY "Public Access for Receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Public Access for Purchase Photos" ON storage.objects FOR SELECT USING (bucket_id = 'purchase_photos');

-- Set up Upload Policies (Authenticated users can upload)
CREATE POLICY "Auth Upload Wishes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'wishes' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Upload Receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Upload Purchase Photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'purchase_photos' AND auth.role() = 'authenticated');
