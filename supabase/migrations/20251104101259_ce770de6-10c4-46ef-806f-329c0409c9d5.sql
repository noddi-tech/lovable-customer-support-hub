-- Step 1: Create bare table structure with NO foreign key constraints
-- This avoids timeout issues from FK validation queries triggering complex RLS policies

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Actor fields (no FK reference yet)
  actor_id uuid,
  actor_email text NOT NULL,
  actor_role text NOT NULL,
  
  -- Action fields
  action_type text NOT NULL,
  action_category text NOT NULL,
  
  -- Target fields
  target_type text NOT NULL,
  target_id uuid,
  target_identifier text,
  
  -- Details
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Organization context (no FK reference yet)
  organization_id uuid
);

-- Add performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON public.admin_audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON public.admin_audit_logs(organization_id);