-- =============================================
-- Widget Configuration Tables
-- =============================================

-- Widget configurations per inbox
CREATE TABLE public.widget_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_id UUID REFERENCES public.inboxes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Appearance
  primary_color TEXT DEFAULT '#7c3aed',
  position TEXT DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
  greeting_text TEXT DEFAULT 'How can we help?',
  response_time_text TEXT DEFAULT 'We usually reply within a few hours',
  
  -- Features
  enable_chat BOOLEAN DEFAULT false,
  enable_contact_form BOOLEAN DEFAULT true,
  enable_knowledge_search BOOLEAN DEFAULT true,
  
  -- Branding
  logo_url TEXT,
  company_name TEXT,
  
  -- Widget identification
  widget_key UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(inbox_id)
);

-- Widget sessions for tracking visitors
CREATE TABLE public.widget_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_config_id UUID REFERENCES public.widget_configs(id) ON DELETE CASCADE,
  visitor_id TEXT, -- Anonymous visitor identifier (stored in localStorage)
  visitor_email TEXT,
  visitor_name TEXT,
  browser_info JSONB,
  page_url TEXT,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.widget_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies for widget_configs
-- =============================================

-- Admins can manage widget configs for their organization
CREATE POLICY "Admins can manage widget configs" ON public.widget_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = widget_configs.organization_id
        AND om.role IN ('admin', 'super_admin')
        AND om.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_memberships om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = widget_configs.organization_id
        AND om.role IN ('admin', 'super_admin')
        AND om.status = 'active'
    )
  );

-- Public read access for active widget configs (needed for widget to fetch config)
CREATE POLICY "Public can read active widget configs" ON public.widget_configs
  FOR SELECT
  USING (is_active = true);

-- =============================================
-- RLS Policies for widget_sessions
-- =============================================

-- Organization members can view sessions for their organization's widgets
CREATE POLICY "Org members can view widget sessions" ON public.widget_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.widget_configs wc
      JOIN public.organization_memberships om ON om.organization_id = wc.organization_id
      WHERE wc.id = widget_sessions.widget_config_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Allow anonymous inserts for widget sessions (visitors)
CREATE POLICY "Anyone can create widget sessions" ON public.widget_sessions
  FOR INSERT
  WITH CHECK (true);

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_widget_configs_inbox_id ON public.widget_configs(inbox_id);
CREATE INDEX idx_widget_configs_organization_id ON public.widget_configs(organization_id);
CREATE INDEX idx_widget_configs_widget_key ON public.widget_configs(widget_key);
CREATE INDEX idx_widget_sessions_widget_config_id ON public.widget_sessions(widget_config_id);
CREATE INDEX idx_widget_sessions_visitor_id ON public.widget_sessions(visitor_id);

-- =============================================
-- Trigger for updated_at
-- =============================================

CREATE TRIGGER update_widget_configs_updated_at
  BEFORE UPDATE ON public.widget_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_widget_sessions_updated_at
  BEFORE UPDATE ON public.widget_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();