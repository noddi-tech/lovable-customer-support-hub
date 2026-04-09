-- Phase 3C: Active learning review queue

CREATE TABLE public.review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.widget_ai_conversations(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('low_eval_score', 'quality_flag', 'negative_feedback', 'knowledge_gap', 'low_confidence')),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Primary query index: org + pending items by priority
CREATE INDEX idx_review_queue_org_status_priority
  ON public.review_queue(organization_id, status, priority, created_at);

-- Prevent duplicate entries for same conversation + reason
CREATE UNIQUE INDEX idx_review_queue_conv_reason
  ON public.review_queue(conversation_id, reason)
  WHERE status = 'pending';

ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view review queue"
  ON public.review_queue FOR SELECT
  USING (organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  ));

CREATE POLICY "Org members can update review queue"
  ON public.review_queue FOR UPDATE
  USING (organization_id IN (
    SELECT om.organization_id FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  ));
