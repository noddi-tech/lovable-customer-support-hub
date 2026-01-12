-- Create public storage bucket for widget assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('widget', 'widget', true, 5242880, ARRAY['application/javascript', 'text/javascript'])
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to widget bucket
CREATE POLICY "Widget files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'widget');

-- Allow authenticated admins to upload widget files
CREATE POLICY "Admins can upload widget files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'widget' AND auth.role() = 'authenticated');