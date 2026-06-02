ALTER TABLE public.application_events
DROP CONSTRAINT IF EXISTS application_events_event_type_check;

ALTER TABLE public.application_events
ADD CONSTRAINT application_events_event_type_check
CHECK (event_type = ANY (ARRAY[
  'stage_change'::text,
  'note_added'::text,
  'email_sent'::text,
  'email_received'::text,
  'phone_call'::text,
  'interview_scheduled'::text,
  'interview_completed'::text,
  'file_uploaded'::text,
  'score_calculated'::text,
  'assigned'::text,
  'sms_sent'::text,
  'created'::text,
  'candidate_form_sent'::text,
  'candidate_form_opened'::text,
  'candidate_form_submitted'::text,
  'candidate_form_revoked'::text
]));