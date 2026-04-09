-- Phase 3B: LLM-as-Judge automated evaluation

-- 1. Add quality columns to widget_ai_messages (Tier 1 inline check)
ALTER TABLE public.widget_ai_messages
  ADD COLUMN IF NOT EXISTS quality_flag TEXT,
  ADD COLUMN IF NOT EXISTS quality_check_passed BOOLEAN DEFAULT true;

-- 2. Create conversation_evaluations table (Tier 2 batch evaluation)
CREATE TABLE public.conversation_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.widget_ai_conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  accuracy_score NUMERIC CHECK (accuracy_score >= 0 AND accuracy_score <= 5),
  helpfulness_score NUMERIC CHECK (helpfulness_score >= 0 AND helpfulness_score <= 5),
  tone_score NUMERIC CHECK (tone_score >= 0 AND tone_score <= 5),
  completeness_score NUMERIC CHECK (completeness_score >= 0 AND completeness_score <= 5),
  policy_score NUMERIC CHECK (policy_score >= 0 AND policy_score <= 5),
  composite_score NUMERIC GENERATED ALWAYS AS (
    (COALESCE(accuracy_score, 0) + COALESCE(helpfulness_score, 0) +
     COALESCE(tone_score, 0) + COALESCE(completeness_score, 0) +
     COALESCE(policy_score, 0)) / 25.0
  ) STORED,
  evaluator_model TEXT,
  evaluation_notes TEXT,
  flagged_for_review BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conv_evaluations_conversation ON public.conversation_evaluations(conversation_id);
CREATE INDEX idx_conv_evaluations_org ON public.conversation_evaluations(organization_id);
CREATE INDEX idx_conv_evaluations_flagged ON public.conversation_evaluations(flagged_for_review)
  WHERE flagged_for_review = true;
CREATE INDEX idx_conv_evaluations_composite ON public.conversation_evaluations(composite_score);

-- RLS: org members can view evaluations
ALTER TABLE public.conversation_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view evaluations"
  ON public.conversation_evaluations FOR SELECT
  USING (organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  ));

-- 3. Schedule nightly evaluation at 02:00 UTC
SELECT cron.unschedule('evaluate-conversations')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluate-conversations');

SELECT cron.schedule(
  'evaluate-conversations',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/evaluate-conversations',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);
