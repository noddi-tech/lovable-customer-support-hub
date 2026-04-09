-- Phase 3A: Preference pair collection for DPO-ready training data

-- 1. Create preference_pairs table
CREATE TABLE public.preference_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_message TEXT NOT NULL,
  chosen_response TEXT NOT NULL,
  rejected_response TEXT NOT NULL,
  edit_category TEXT CHECK (edit_category IN ('tone', 'factual', 'policy', 'completeness', 'format')),
  edit_distance NUMERIC,
  response_tracking_id UUID REFERENCES public.response_tracking(id) ON DELETE SET NULL,
  quality_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_preference_pairs_org ON public.preference_pairs(organization_id);
CREATE INDEX idx_preference_pairs_category ON public.preference_pairs(edit_category);
CREATE INDEX idx_preference_pairs_tracking
  ON public.preference_pairs(response_tracking_id)
  WHERE response_tracking_id IS NOT NULL;

-- 2. Trigger: fire classify-agent-edit when a refined response is tracked
CREATE OR REPLACE FUNCTION public.notify_classify_agent_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.was_refined = true
     AND NEW.original_ai_suggestion IS NOT NULL
     AND NEW.customer_message IS NOT NULL
  THEN
    PERFORM net.http_post(
      url := 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/classify-agent-edit',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('responseTrackingId', NEW.id::text)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_classify_agent_edit
  AFTER INSERT ON public.response_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_classify_agent_edit();
