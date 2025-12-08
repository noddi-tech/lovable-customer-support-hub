-- Create email ingestion logs table for tracking all email attempts
CREATE TABLE public.email_ingestion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'sendgrid', 'gmail_sync'
  status TEXT NOT NULL, -- 'received', 'processed', 'failed', 'auth_failed', 'duplicate'
  from_email TEXT,
  to_email TEXT,
  subject TEXT,
  external_id TEXT,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast queries
CREATE INDEX idx_email_ingestion_logs_created_at ON public.email_ingestion_logs(created_at DESC);
CREATE INDEX idx_email_ingestion_logs_source ON public.email_ingestion_logs(source);
CREATE INDEX idx_email_ingestion_logs_status ON public.email_ingestion_logs(status);

-- Enable RLS
ALTER TABLE public.email_ingestion_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all logs
CREATE POLICY "Super admins can view email ingestion logs"
ON public.email_ingestion_logs
FOR SELECT
USING (public.is_super_admin());

-- System can insert logs (no auth required for edge functions)
CREATE POLICY "System can insert email ingestion logs"
ON public.email_ingestion_logs
FOR INSERT
WITH CHECK (true);

-- Auto-cleanup old logs (keep 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_email_ingestion_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.email_ingestion_logs
  WHERE created_at < now() - interval '30 days';
END;
$$;