-- Create import_jobs table for tracking import progress
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  total_mailboxes INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  conversations_imported INTEGER DEFAULT 0,
  messages_imported INTEGER DEFAULT 0,
  customers_imported INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- Allow users to view import jobs in their organization
CREATE POLICY "Users can view import jobs in their organization"
  ON public.import_jobs
  FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Allow users to create import jobs in their organization
CREATE POLICY "Users can create import jobs in their organization"
  ON public.import_jobs
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Allow system to update import jobs
CREATE POLICY "System can update import jobs"
  ON public.import_jobs
  FOR UPDATE
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_import_jobs_organization_id ON public.import_jobs(organization_id);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX idx_import_jobs_created_at ON public.import_jobs(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER set_import_jobs_updated_at
  BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();