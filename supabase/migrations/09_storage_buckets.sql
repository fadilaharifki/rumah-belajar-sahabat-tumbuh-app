-- 09_storage_buckets.sql: Supabase Storage Buckets & Policies

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Allow Public Read Access
CREATE POLICY "Public Access Avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- Storage Policy: Allow Authenticated Users to Upload Avatars
CREATE POLICY "Upload Avatars" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars');
