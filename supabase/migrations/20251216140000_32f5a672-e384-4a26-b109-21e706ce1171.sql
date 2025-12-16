-- Create invite_email_logs table for tracking invite email delivery status
CREATE TABLE public.invite_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'invite', 'resend_invite', 'direct_creation'
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'bounced', 'failed'
  provider TEXT NOT NULL DEFAULT 'supabase_auth', -- 'supabase_auth', 'sendgrid'
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by_id UUID,
  organization_id UUID REFERENCES public.organizations(id)
);

-- Indexes for quick lookups
CREATE INDEX idx_invite_email_logs_email ON invite_email_logs(email);
CREATE INDEX idx_invite_email_logs_user_id ON invite_email_logs(user_id);
CREATE INDEX idx_invite_email_logs_status ON invite_email_logs(status);
CREATE INDEX idx_invite_email_logs_created_at ON invite_email_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.invite_email_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view logs
CREATE POLICY "Admins can view invite logs" ON invite_email_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- System can insert logs (edge functions use service role)
CREATE POLICY "System can insert invite logs" ON invite_email_logs
  FOR INSERT WITH CHECK (true);