INSERT INTO public.recruitment_scheduled_emails (organization_id, inbox_id, applicant_id, to_email, to_name, subject, body_html, scheduled_for, created_by, status)
VALUES (
  'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b',
  '0a4a06a4-498d-4d4b-97e3-87b5bb636ec7',
  '3294f7c2-4744-4d7b-85b5-771231017163',
  'smoketest+b6@example.invalid',
  'Smoke Test',
  '[B6 SMOKE TEST] please ignore',
  '<p>This is an automated B6 smoke test of process-scheduled-emails.</p>',
  NOW() - INTERVAL '1 minute',
  '308a8607-9f66-4df5-b7f7-d92091b737f3',
  'pending'
);