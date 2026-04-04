
CREATE TABLE public.bulk_outreach_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  subject TEXT NOT NULL,
  message_template TEXT NOT NULL,
  inbox_id UUID REFERENCES public.inboxes(id),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_outreach_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bulk outreach jobs in their organization"
  ON public.bulk_outreach_jobs
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bulk outreach jobs in their organization"
  ON public.bulk_outreach_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_memberships om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own bulk outreach jobs"
  ON public.bulk_outreach_jobs
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());
