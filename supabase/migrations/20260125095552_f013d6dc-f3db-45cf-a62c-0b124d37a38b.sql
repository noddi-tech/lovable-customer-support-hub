-- Create chat attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for authenticated agent uploads
CREATE POLICY "Agents can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- RLS policy for reading attachments (both agents and anonymous for widget)
CREATE POLICY "Users can view chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments');

-- Allow widget visitors to download attachments sent in chat
CREATE POLICY "Anon users can view chat attachments"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'chat-attachments');