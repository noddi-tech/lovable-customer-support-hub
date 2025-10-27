-- Sprint 1: Service Tickets Database Schema

-- Create service ticket status enum
CREATE TYPE service_ticket_status AS ENUM (
  'open',
  'in_progress',
  'pending_customer',
  'on_hold',
  'scheduled',
  'resolved',
  'closed',
  'cancelled'
);

-- Create service ticket priority enum
CREATE TYPE service_ticket_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

-- Create service ticket category enum
CREATE TYPE service_ticket_category AS ENUM (
  'tire_issue',
  'service_complaint',
  'delivery_issue',
  'installation_problem',
  'warranty_claim',
  'technical_support',
  'other'
);

-- Create service_tickets table
CREATE TABLE public.service_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  
  -- Basic Information
  title TEXT NOT NULL,
  description TEXT,
  category service_ticket_category NOT NULL DEFAULT 'other',
  status service_ticket_status NOT NULL DEFAULT 'open',
  priority service_ticket_priority NOT NULL DEFAULT 'normal',
  
  -- Customer Information
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  
  -- Assignment & Ownership
  assigned_to_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_id UUID NOT NULL REFERENCES auth.users(id),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  
  -- Service Details
  service_type TEXT,
  service_location TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  
  -- SLA Tracking
  sla_due_date TIMESTAMP WITH TIME ZONE,
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolution_time_minutes INTEGER,
  
  -- Financial
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  
  -- Integration Data
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
  noddi_booking_id INTEGER,
  noddi_user_group_id INTEGER,
  
  -- Metadata
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_ticket_number_per_org UNIQUE (organization_id, ticket_number)
);

-- Create index for ticket number lookups
CREATE INDEX idx_service_tickets_ticket_number ON public.service_tickets(ticket_number);
CREATE INDEX idx_service_tickets_organization ON public.service_tickets(organization_id);
CREATE INDEX idx_service_tickets_status ON public.service_tickets(status);
CREATE INDEX idx_service_tickets_assigned_to ON public.service_tickets(assigned_to_id);
CREATE INDEX idx_service_tickets_customer ON public.service_tickets(customer_id);
CREATE INDEX idx_service_tickets_created_at ON public.service_tickets(created_at DESC);
CREATE INDEX idx_service_tickets_scheduled_date ON public.service_tickets(scheduled_date);

-- Create service_ticket_events table
CREATE TABLE public.service_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  comment TEXT,
  triggered_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_ticket_events_ticket ON public.service_ticket_events(ticket_id);
CREATE INDEX idx_service_ticket_events_created_at ON public.service_ticket_events(created_at DESC);

-- Create service_ticket_comments table
CREATE TABLE public.service_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_ticket_comments_ticket ON public.service_ticket_comments(ticket_id);
CREATE INDEX idx_service_ticket_comments_created_at ON public.service_ticket_comments(created_at DESC);

-- Create service_ticket_attachments table
CREATE TABLE public.service_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_ticket_attachments_ticket ON public.service_ticket_attachments(ticket_id);

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION public.generate_ticket_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  ticket_count INTEGER;
  new_ticket_number TEXT;
BEGIN
  SELECT COUNT(*) INTO ticket_count
  FROM public.service_tickets
  WHERE organization_id = org_id;
  
  new_ticket_number := 'ST-' || LPAD((ticket_count + 1)::TEXT, 6, '0');
  
  RETURN new_ticket_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_ticket_number(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
BEFORE INSERT ON public.service_tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_ticket_number();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_service_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_ticket_timestamp
BEFORE UPDATE ON public.service_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_service_ticket_timestamp();

-- Trigger to log ticket events
CREATE OR REPLACE FUNCTION public.log_service_ticket_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.service_ticket_events (ticket_id, event_type, old_value, new_value, triggered_by_id)
    VALUES (NEW.id, 'status_changed', OLD.status::TEXT, NEW.status::TEXT, auth.uid());
  END IF;
  
  -- Log assignment changes
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id) THEN
    INSERT INTO public.service_ticket_events (ticket_id, event_type, old_value, new_value, triggered_by_id)
    VALUES (NEW.id, 'assigned', OLD.assigned_to_id::TEXT, NEW.assigned_to_id::TEXT, auth.uid());
  END IF;
  
  -- Log priority changes
  IF (TG_OP = 'UPDATE' AND OLD.priority IS DISTINCT FROM NEW.priority) THEN
    INSERT INTO public.service_ticket_events (ticket_id, event_type, old_value, new_value, triggered_by_id)
    VALUES (NEW.id, 'priority_changed', OLD.priority::TEXT, NEW.priority::TEXT, auth.uid());
  END IF;
  
  -- Log creation
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.service_ticket_events (ticket_id, event_type, new_value, triggered_by_id)
    VALUES (NEW.id, 'created', NEW.status::TEXT, NEW.created_by_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_service_ticket_event
AFTER INSERT OR UPDATE ON public.service_tickets
FOR EACH ROW
EXECUTE FUNCTION public.log_service_ticket_event();

-- RLS Policies for service_tickets
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tickets in their organization"
ON public.service_tickets FOR SELECT
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can create tickets in their organization"
ON public.service_tickets FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND created_by_id = auth.uid()
);

CREATE POLICY "Users can update tickets in their organization"
ON public.service_tickets FOR UPDATE
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete tickets in their organization"
ON public.service_tickets FOR DELETE
USING (
  organization_id = public.get_user_organization_id()
  AND public.has_permission(auth.uid(), 'manage_settings'::app_permission)
);

-- RLS Policies for service_ticket_events
ALTER TABLE public.service_ticket_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for tickets in their organization"
ON public.service_ticket_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.service_tickets st
    WHERE st.id = service_ticket_events.ticket_id
    AND st.organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "System can insert ticket events"
ON public.service_ticket_events FOR INSERT
WITH CHECK (true);

-- RLS Policies for service_ticket_comments
ALTER TABLE public.service_ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments for tickets in their organization"
ON public.service_ticket_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.service_tickets st
    WHERE st.id = service_ticket_comments.ticket_id
    AND st.organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "Users can create comments on tickets in their organization"
ON public.service_ticket_comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.service_tickets st
    WHERE st.id = service_ticket_comments.ticket_id
    AND st.organization_id = public.get_user_organization_id()
  )
  AND created_by_id = auth.uid()
);

CREATE POLICY "Users can update their own comments"
ON public.service_ticket_comments FOR UPDATE
USING (created_by_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON public.service_ticket_comments FOR DELETE
USING (created_by_id = auth.uid());

-- RLS Policies for service_ticket_attachments
ALTER TABLE public.service_ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for tickets in their organization"
ON public.service_ticket_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.service_tickets st
    WHERE st.id = service_ticket_attachments.ticket_id
    AND st.organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "Users can upload attachments to tickets in their organization"
ON public.service_ticket_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.service_tickets st
    WHERE st.id = service_ticket_attachments.ticket_id
    AND st.organization_id = public.get_user_organization_id()
  )
  AND uploaded_by_id = auth.uid()
);

CREATE POLICY "Users can delete their own attachments"
ON public.service_ticket_attachments FOR DELETE
USING (uploaded_by_id = auth.uid());