-- Create voicemails storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voicemails', 'voicemails', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for voicemails
CREATE POLICY "Voicemails are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'voicemails');

-- Users can upload voicemails (for the edge function)
CREATE POLICY "Service role can manage voicemails" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'voicemails');