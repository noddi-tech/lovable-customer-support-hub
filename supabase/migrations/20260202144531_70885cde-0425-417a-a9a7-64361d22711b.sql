-- Create table for tracking extraction jobs
CREATE TABLE public.knowledge_extraction_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_conversations INTEGER DEFAULT 0,
  total_processed INTEGER DEFAULT 0,
  entries_created INTEGER DEFAULT 0,
  entries_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for pending knowledge entries awaiting review
CREATE TABLE public.knowledge_pending_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_context TEXT NOT NULL,
  agent_response TEXT NOT NULL,
  source_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  source_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  suggested_category_id UUID REFERENCES public.knowledge_categories(id) ON DELETE SET NULL,
  suggested_tags TEXT[] DEFAULT '{}',
  ai_quality_score NUMERIC(3,2) CHECK (ai_quality_score >= 0 AND ai_quality_score <= 5),
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'edited')),
  reviewed_by_id UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  extraction_job_id UUID REFERENCES public.knowledge_extraction_jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_extraction_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_pending_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for extraction jobs
CREATE POLICY "Users can view extraction jobs for their organization"
  ON public.knowledge_extraction_jobs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create extraction jobs for their organization"
  ON public.knowledge_extraction_jobs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update extraction jobs for their organization"
  ON public.knowledge_extraction_jobs
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS policies for pending entries
CREATE POLICY "Users can view pending entries for their organization"
  ON public.knowledge_pending_entries
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create pending entries for their organization"
  ON public.knowledge_pending_entries
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update pending entries for their organization"
  ON public.knowledge_pending_entries
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete pending entries for their organization"
  ON public.knowledge_pending_entries
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_extraction_jobs_org_status ON public.knowledge_extraction_jobs(organization_id, status);
CREATE INDEX idx_pending_entries_org_status ON public.knowledge_pending_entries(organization_id, review_status);
CREATE INDEX idx_pending_entries_job ON public.knowledge_pending_entries(extraction_job_id);
CREATE INDEX idx_pending_entries_quality ON public.knowledge_pending_entries(ai_quality_score DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_knowledge_extraction_jobs_updated_at
  BEFORE UPDATE ON public.knowledge_extraction_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_pending_entries_updated_at
  BEFORE UPDATE ON public.knowledge_pending_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();