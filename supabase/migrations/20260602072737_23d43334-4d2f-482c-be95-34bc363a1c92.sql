-- Seed candidate-form-invitation email + SMS templates per organization.
-- Idempotent: NOT EXISTS guard on (organization_id, name, type).

INSERT INTO public.recruitment_email_templates
  (organization_id, name, description, subject, body, stage_trigger, is_active, type)
SELECT
  o.id,
  'Kandidatskjema – invitasjon',
  'Sendes når en søker får tilsendt kandidatskjemaet (e-post).',
  'Vi trenger litt mer info – {{position_title}}',
  $body$<p>Hei {{first_name}},</p>
<p>Takk for søknaden til <strong>{{position_title}}</strong> hos {{organization_name}}. For å komme videre i prosessen trenger vi litt mer informasjon fra deg.</p>
<p>Klikk på lenken under for å fylle ut skjemaet. Du vil bli bedt om å bekrefte de siste 4 sifrene i telefonnummeret ditt før du får tilgang.</p>
<p><a href="{{form_url}}" style="display:inline-block;padding:12px 20px;background:{{brand_color}};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Åpne skjema</a></p>
<p>Lenken er gyldig til <strong>{{expires_at}}</strong>.</p>
<p>Hvis knappen ikke virker, kopier denne adressen i nettleseren:<br><a href="{{form_url}}">{{form_url}}</a></p>
<p>Med vennlig hilsen,<br>{{recruiter_name}}<br>{{organization_name}}</p>$body$,
  NULL,
  TRUE,
  'email'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.recruitment_email_templates t
  WHERE t.organization_id = o.id
    AND t.name = 'Kandidatskjema – invitasjon'
    AND t.type = 'email'
);

INSERT INTO public.recruitment_email_templates
  (organization_id, name, description, subject, body, stage_trigger, is_active, type)
SELECT
  o.id,
  'Kandidatskjema – invitasjon (SMS)',
  'Sendes når en søker får tilsendt kandidatskjemaet (SMS). Hold kort – maks 160 tegn anbefales.',
  'Kandidatskjema',
  'Hei {{first_name}}! {{organization_name}} trenger litt mer info for soknaden til {{position_title}}. Apne skjema: {{form_url}} (utloper {{expires_at}})',
  NULL,
  TRUE,
  'sms'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.recruitment_email_templates t
  WHERE t.organization_id = o.id
    AND t.name = 'Kandidatskjema – invitasjon (SMS)'
    AND t.type = 'sms'
);