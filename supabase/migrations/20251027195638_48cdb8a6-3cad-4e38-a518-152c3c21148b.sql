-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for ticket-attachments bucket
CREATE POLICY "Users can view attachments in their organization"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ticket-attachments' AND
  EXISTS (
    SELECT 1 FROM service_tickets st
    WHERE st.id::text = (storage.foldername(name))[1]
    AND st.organization_id = get_user_organization_id()
  )
);

CREATE POLICY "Users can upload attachments to their tickets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments' AND
  EXISTS (
    SELECT 1 FROM service_tickets st
    WHERE st.id::text = (storage.foldername(name))[1]
    AND st.organization_id = get_user_organization_id()
  )
);

CREATE POLICY "Users can delete attachments from their tickets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ticket-attachments' AND
  EXISTS (
    SELECT 1 FROM service_tickets st
    WHERE st.id::text = (storage.foldername(name))[1]
    AND st.organization_id = get_user_organization_id()
  )
);