
-- Add RLS policies for message-attachments bucket so authenticated agents can upload and read
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "Authenticated users can read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'message-attachments');
