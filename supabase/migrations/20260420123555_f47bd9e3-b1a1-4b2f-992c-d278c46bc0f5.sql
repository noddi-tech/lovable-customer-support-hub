-- 1. Add tuning columns to slack_integrations
ALTER TABLE public.slack_integrations
  ADD COLUMN IF NOT EXISTS critical_keyword_overrides jsonb NOT NULL DEFAULT '{"disabled": [], "added": []}'::jsonb,
  ADD COLUMN IF NOT EXISTS critical_ai_severity_thresholds jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. critical_alert_feedback
CREATE TABLE IF NOT EXISTS public.critical_alert_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trigger_source text NOT NULL CHECK (trigger_source IN ('keyword','ai','batch_keyword')),
  matched_keyword text,
  ai_category text,
  resolved_bucket text CHECK (resolved_bucket IN ('tech','ops')),
  reaction text NOT NULL CHECK (reaction IN ('+1','-1','mute')),
  reactor_slack_id text NOT NULL,
  reactor_email text,
  slack_channel_id text,
  slack_message_ts text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, reactor_slack_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_caf_org_created ON public.critical_alert_feedback (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_caf_keyword ON public.critical_alert_feedback (organization_id, matched_keyword);
CREATE INDEX IF NOT EXISTS idx_caf_category ON public.critical_alert_feedback (organization_id, ai_category);

ALTER TABLE public.critical_alert_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view feedback"
  ON public.critical_alert_feedback FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  ));

-- 3. critical_keyword_mutes
CREATE TABLE IF NOT EXISTS public.critical_keyword_mutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  muted_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  muted_via text NOT NULL DEFAULT 'reaction' CHECK (muted_via IN ('reaction','admin')),
  expires_at timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_ckm_org_expires ON public.critical_keyword_mutes (organization_id, expires_at);

ALTER TABLE public.critical_keyword_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view mutes"
  ON public.critical_keyword_mutes FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org admins can insert mutes"
  ON public.critical_keyword_mutes FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Org admins can delete mutes"
  ON public.critical_keyword_mutes FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- 4. triage_pattern_proposals
CREATE TABLE IF NOT EXISTS public.triage_pattern_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_type text NOT NULL CHECK (proposal_type IN ('add_keyword','remove_keyword','raise_threshold','lower_threshold')),
  value text NOT NULL,
  category text,
  threshold_value int,
  reason text NOT NULL,
  evidence_conversation_ids uuid[] NOT NULL DEFAULT '{}',
  evidence_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
  reviewed_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tpp_org_status ON public.triage_pattern_proposals (organization_id, status, created_at DESC);

ALTER TABLE public.triage_pattern_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view proposals"
  ON public.triage_pattern_proposals FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Org admins can update proposals"
  ON public.triage_pattern_proposals FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );