
-- =========================================================
-- Phase B6 — Recruitment email integration (foundation)
-- =========================================================

-- 1. Inbox purpose ----------------------------------------------------------
ALTER TABLE public.inboxes
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'support';

ALTER TABLE public.inboxes
  DROP CONSTRAINT IF EXISTS inboxes_purpose_check;
ALTER TABLE public.inboxes
  ADD CONSTRAINT inboxes_purpose_check
  CHECK (purpose IN ('support','recruitment'));

CREATE INDEX IF NOT EXISTS idx_inboxes_org_purpose
  ON public.inboxes (organization_id, purpose);

-- 2. Conversations: type + applicant link -----------------------------------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS conversation_type text NOT NULL DEFAULT 'support';

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_conversation_type_check;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_conversation_type_check
  CHECK (conversation_type IN ('support','recruitment'));

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS applicant_id uuid NULL
  REFERENCES public.applicants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_conversation_type
  ON public.conversations (conversation_type);
CREATE INDEX IF NOT EXISTS idx_conversations_applicant_id
  ON public.conversations (applicant_id) WHERE applicant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_org_type_updated
  ON public.conversations (organization_id, conversation_type, updated_at DESC);

-- 3. Profile email display name --------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_display_name text NULL;

-- 4. Organization-level attachment expiry default --------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_attachment_expiry_days integer NOT NULL DEFAULT 7;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_default_attachment_expiry_days_check;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_default_attachment_expiry_days_check
  CHECK (default_attachment_expiry_days BETWEEN 1 AND 30);

-- 5. Scheduled emails table -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recruitment_scheduled_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  applicant_id uuid NULL REFERENCES public.applicants(id) ON DELETE SET NULL,
  inbox_id uuid NOT NULL REFERENCES public.inboxes(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  to_name text NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text NULL,
  attachments jsonb NULL,
  scheduled_for timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NULL,
  sent_at timestamptz NULL,
  error_message text NULL,
  message_id uuid NULL REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recruitment_scheduled_emails_status_check
    CHECK (status IN ('pending','processing','sent','failed','cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_rse_status_scheduled
  ON public.recruitment_scheduled_emails (status, scheduled_for)
  WHERE status IN ('pending','processing');
CREATE INDEX IF NOT EXISTS idx_rse_applicant
  ON public.recruitment_scheduled_emails (applicant_id);
CREATE INDEX IF NOT EXISTS idx_rse_created_by
  ON public.recruitment_scheduled_emails (created_by);
CREATE INDEX IF NOT EXISTS idx_rse_org
  ON public.recruitment_scheduled_emails (organization_id);

ALTER TABLE public.recruitment_scheduled_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rse_select_org" ON public.recruitment_scheduled_emails;
CREATE POLICY "rse_select_org"
  ON public.recruitment_scheduled_emails
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "rse_insert_org" ON public.recruitment_scheduled_emails;
CREATE POLICY "rse_insert_org"
  ON public.recruitment_scheduled_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "rse_update_creator_or_admin" ON public.recruitment_scheduled_emails;
CREATE POLICY "rse_update_creator_or_admin"
  ON public.recruitment_scheduled_emails
  FOR UPDATE
  TO authenticated
  USING (
    public.is_org_member(organization_id) AND (
      created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

DROP POLICY IF EXISTS "rse_delete_creator_or_admin" ON public.recruitment_scheduled_emails;
CREATE POLICY "rse_delete_creator_or_admin"
  ON public.recruitment_scheduled_emails
  FOR DELETE
  TO authenticated
  USING (
    public.is_org_member(organization_id) AND (
      created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

DROP TRIGGER IF EXISTS trg_rse_updated_at ON public.recruitment_scheduled_emails;
CREATE TRIGGER trg_rse_updated_at
  BEFORE UPDATE ON public.recruitment_scheduled_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Cron: process scheduled emails every 5 minutes -----------------------
-- Unschedule prior version if present (idempotent)
DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'recruitment-process-scheduled-emails';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'recruitment-process-scheduled-emails',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/process-scheduled-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzIwMDMsImV4cCI6MjA2OTYwODAwM30.Q5dNwdnAxCDwhaEluhFnCO1hbTY4rZ1uhEy284FLhTE'
    ),
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);

-- Surface the new cron job id for ops visibility
DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'recruitment-process-scheduled-emails';
  RAISE NOTICE '[B6] cron job recruitment-process-scheduled-emails registered with jobid=%', jid;
END $$;
