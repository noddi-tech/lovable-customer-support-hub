-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv', 'text/html',
    'application/zip', 'application/x-rar-compressed',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for message-attachments bucket
-- Allow authenticated users to read attachments from their organization
CREATE POLICY "Users can read attachments from their organization"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT om.organization_id::text 
    FROM public.organization_memberships om 
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);

-- Service role can insert attachments (used by edge functions)
CREATE POLICY "Service role can insert attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments'
);

-- Service role can delete attachments
CREATE POLICY "Service role can delete attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments'
);