-- Create user_sessions table to track login sessions
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  
  -- Session timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  -- Session metadata
  session_type TEXT NOT NULL DEFAULT 'login',
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  end_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_activity_events table to track user actions
CREATE TABLE public.user_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.user_sessions(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  
  -- Event details
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  
  -- Context
  page_path TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_organization_id ON public.user_sessions(organization_id);
CREATE INDEX idx_user_sessions_started_at ON public.user_sessions(started_at DESC);
CREATE INDEX idx_user_sessions_is_active ON public.user_sessions(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_user_activity_events_user_id ON public.user_activity_events(user_id);
CREATE INDEX idx_user_activity_events_session_id ON public.user_activity_events(session_id);
CREATE INDEX idx_user_activity_events_organization_id ON public.user_activity_events(organization_id);
CREATE INDEX idx_user_activity_events_created_at ON public.user_activity_events(created_at DESC);
CREATE INDEX idx_user_activity_events_event_type ON public.user_activity_events(event_type);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_sessions
-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON public.user_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
ON public.user_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all sessions in their organization
CREATE POLICY "Admins can view org sessions"
ON public.user_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_memberships om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = user_sessions.organization_id
    AND om.role IN ('admin', 'super_admin')
    AND om.status = 'active'
  )
);

-- RLS policies for user_activity_events
-- Users can view their own activity
CREATE POLICY "Users can view own activity"
ON public.user_activity_events
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own activity
CREATE POLICY "Users can insert own activity"
ON public.user_activity_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all activity in their organization
CREATE POLICY "Admins can view org activity"
ON public.user_activity_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_memberships om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = user_activity_events.organization_id
    AND om.role IN ('admin', 'super_admin')
    AND om.status = 'active'
  )
);