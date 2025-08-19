-- Create storage bucket for voicemail recordings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voicemails', 'voicemails', false);

-- Create voicemail_left internal event type if it doesn't exist
INSERT INTO public.internal_event_types (name, description, schema, is_active) 
VALUES (
  'voicemail_left', 
  'Voicemail was left by caller', 
  '{
    "type": "object",
    "properties": {
      "recording_url": {"type": "string"},
      "duration": {"type": "number"},
      "transcription": {"type": "string"}
    }
  }', 
  true
) ON CONFLICT (name) DO NOTHING;

-- Add webhook mapping for voicemail events
INSERT INTO public.webhook_event_mappings (
  provider,
  external_event,
  internal_event_type,
  condition_rules,
  data_mapping,
  is_active
) VALUES (
  'aircall',
  'call.voicemail',
  'voicemail_left',
  '{}',
  '{
    "recording_url": "$.eventData.callData.voicemail.recording_url",
    "duration": "$.eventData.callData.voicemail.duration",
    "transcription": "$.eventData.callData.voicemail.transcription"
  }',
  true
) ON CONFLICT (provider, external_event, internal_event_type) DO NOTHING;

-- Create RLS policies for voicemail bucket
CREATE POLICY "Users can view voicemails in their organization" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'voicemails' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can upload voicemails" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'voicemails');

CREATE POLICY "Users can delete voicemails in their organization" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'voicemails' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);