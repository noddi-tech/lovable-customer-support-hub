INSERT INTO public.application_events
  (organization_id, application_id, applicant_id, event_type, event_data, created_at)
SELECT
  ae.organization_id,
  t.application_id,
  ae.applicant_id,
  ae.event_type,
  COALESCE(ae.context, '{}'::jsonb) || jsonb_build_object('token_id', t.id::text, 'backfilled', true),
  ae.occurred_at
FROM public.recruitment_audit_events ae
JOIN public.candidate_form_tokens t ON t.id = ae.subject_id
WHERE ae.event_type IN (
  'candidate_form_sent','candidate_form_opened',
  'candidate_form_submitted','candidate_form_revoked'
)
AND ae.applicant_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.application_events ev
  WHERE ev.applicant_id = ae.applicant_id
    AND ev.event_type = ae.event_type
    AND ev.event_data->>'token_id' = t.id::text
);