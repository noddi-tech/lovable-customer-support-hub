-- Phase 4: Confidence-gated autonomy

-- 1. Add confidence columns to widget_ai_messages
ALTER TABLE public.widget_ai_messages
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC,
  ADD COLUMN IF NOT EXISTS confidence_breakdown JSONB;

-- 2. Create topic_autonomy_levels table
CREATE TABLE public.topic_autonomy_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  intent_category TEXT NOT NULL,
  current_level INTEGER DEFAULT 0 CHECK (current_level >= 0 AND current_level <= 3),
  total_responses INTEGER DEFAULT 0,
  acceptance_rate NUMERIC,
  avg_confidence NUMERIC,
  avg_eval_score NUMERIC,
  last_negative_feedback_at TIMESTAMPTZ,
  last_evaluated_at TIMESTAMPTZ,
  override_max_level INTEGER CHECK (override_max_level IS NULL OR (override_max_level >= 0 AND override_max_level <= 3)),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, intent_category)
);

CREATE INDEX idx_topic_autonomy_org ON public.topic_autonomy_levels(organization_id);
CREATE INDEX idx_topic_autonomy_level ON public.topic_autonomy_levels(current_level);

ALTER TABLE public.topic_autonomy_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view autonomy levels"
  ON public.topic_autonomy_levels FOR SELECT
  USING (organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  ));

CREATE POLICY "Org members can update autonomy levels"
  ON public.topic_autonomy_levels FOR UPDATE
  USING (organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  ));

-- 3. Schedule weekly autonomy evaluation (Sundays 03:00 UTC)
SELECT cron.unschedule('evaluate-autonomy-levels')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluate-autonomy-levels');

SELECT cron.schedule(
  'evaluate-autonomy-levels',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/evaluate-autonomy-levels',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);
