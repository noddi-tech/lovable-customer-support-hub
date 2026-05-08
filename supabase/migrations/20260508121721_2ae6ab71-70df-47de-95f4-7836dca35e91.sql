
ALTER TYPE public.communication_channel ADD VALUE IF NOT EXISTS 'sms';

ALTER TABLE public.inboxes
  ADD COLUMN IF NOT EXISTS sms_provider TEXT NULL,
  ADD COLUMN IF NOT EXISTS sms_provider_phone_number TEXT NULL,
  ADD COLUMN IF NOT EXISTS sms_provider_metadata JSONB NULL,
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inboxes_sms_provider_check') THEN
    ALTER TABLE public.inboxes
      ADD CONSTRAINT inboxes_sms_provider_check
      CHECK (sms_provider IS NULL OR sms_provider IN ('messente','twilio'));
  END IF;
END $$;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sms_provider TEXT NULL,
  ADD COLUMN IF NOT EXISTS sms_provider_message_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS sms_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS sms_segments INTEGER NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_sms_status_check') THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_sms_status_check
      CHECK (sms_status IS NULL OR sms_status IN ('queued','sending','sent','delivered','failed','undelivered'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_sms_provider_message_id
  ON public.messages (sms_provider, sms_provider_message_id)
  WHERE sms_provider_message_id IS NOT NULL;

ALTER TABLE public.applicant_conversations
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applicant_conversations_channel_check') THEN
    ALTER TABLE public.applicant_conversations
      ADD CONSTRAINT applicant_conversations_channel_check
      CHECK (channel IN ('email','sms'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_applicant_conversations_applicant_channel
  ON public.applicant_conversations (applicant_id, channel);

-- NOTE: Table name is legacy. The `type` column lets us store SMS templates here too.
-- A rename to recruitment_message_templates was considered but skipped to avoid
-- churning ~10 downstream files (hooks, edge functions, SQL functions).
ALTER TABLE public.recruitment_email_templates
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'email';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recruitment_email_templates_type_check') THEN
    ALTER TABLE public.recruitment_email_templates
      ADD CONSTRAINT recruitment_email_templates_type_check
      CHECK (type IN ('email','sms'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.recruitment_scheduled_sms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  conversation_id UUID NULL,
  applicant_id UUID NULL,
  inbox_id UUID NOT NULL,
  to_phone TEXT NOT NULL,
  to_name TEXT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NULL,
  sent_at TIMESTAMPTZ NULL,
  error_message TEXT NULL,
  message_id UUID NULL,
  sms_provider TEXT NULL,
  sms_provider_message_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recruitment_scheduled_sms_status_check
    CHECK (status IN ('pending','processing','sent','failed','cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_recruitment_scheduled_sms_status_due
  ON public.recruitment_scheduled_sms (status, scheduled_for)
  WHERE status IN ('pending','processing');

CREATE INDEX IF NOT EXISTS idx_recruitment_scheduled_sms_org
  ON public.recruitment_scheduled_sms (organization_id);

DROP TRIGGER IF EXISTS update_recruitment_scheduled_sms_updated_at ON public.recruitment_scheduled_sms;
CREATE TRIGGER update_recruitment_scheduled_sms_updated_at
  BEFORE UPDATE ON public.recruitment_scheduled_sms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.recruitment_scheduled_sms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rss_select_org ON public.recruitment_scheduled_sms;
CREATE POLICY rss_select_org ON public.recruitment_scheduled_sms FOR SELECT
  USING (is_org_member(organization_id));

DROP POLICY IF EXISTS rss_insert_org ON public.recruitment_scheduled_sms;
CREATE POLICY rss_insert_org ON public.recruitment_scheduled_sms FOR INSERT
  WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS rss_update_creator_or_admin ON public.recruitment_scheduled_sms;
CREATE POLICY rss_update_creator_or_admin ON public.recruitment_scheduled_sms FOR UPDATE
  USING (is_org_member(organization_id) AND (
    created_by = (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  ));

DROP POLICY IF EXISTS rss_delete_creator_or_admin ON public.recruitment_scheduled_sms;
CREATE POLICY rss_delete_creator_or_admin ON public.recruitment_scheduled_sms FOR DELETE
  USING (is_org_member(organization_id) AND (
    created_by = (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  ));

UPDATE public.applicants
   SET phone = '+47' || phone
 WHERE phone ~ '^[0-9]{8}$';
