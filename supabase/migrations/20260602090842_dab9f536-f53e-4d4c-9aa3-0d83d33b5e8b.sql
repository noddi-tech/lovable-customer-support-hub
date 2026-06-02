-- Replace the hand-styled CTA <a> in the candidate-form invitation email body
-- with the server-side {{cta_button:Åpne skjema:form_url}} placeholder.
-- Idempotent: only updates rows that still contain the old styled <a>.

UPDATE public.recruitment_email_templates
SET body = regexp_replace(
  body,
  '<p>\s*<a\s+href="\{\{form_url\}\}"\s+style="[^"]*"\s*>\s*Åpne skjema\s*</a>\s*</p>',
  '<p>{{cta_button:Åpne skjema:form_url}}</p>',
  'gi'
)
WHERE name = 'Kandidatskjema – invitasjon'
  AND type = 'email'
  AND soft_deleted_at IS NULL
  AND body ~ '<a\s+href="\{\{form_url\}\}"\s+style=';
