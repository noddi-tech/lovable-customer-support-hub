-- Create inboxes table
CREATE TABLE public.inboxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID,
  is_default BOOLEAN DEFAULT false,
  auto_assignment_rules JSONB DEFAULT '{}',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_id UUID
);

-- Enable RLS
ALTER TABLE public.inboxes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inboxes
CREATE POLICY "Users can view inboxes in their organization" 
ON public.inboxes 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create inboxes in their organization" 
ON public.inboxes 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update inboxes in their organization" 
ON public.inboxes 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete inboxes in their organization" 
ON public.inboxes 
FOR DELETE 
USING (organization_id = get_user_organization_id());

-- Add inbox_id to conversations table
ALTER TABLE public.conversations 
ADD COLUMN inbox_id UUID;

-- Add inbox_id to email_accounts for routing
ALTER TABLE public.email_accounts 
ADD COLUMN inbox_id UUID;

-- Create trigger for updated_at
CREATE TRIGGER update_inboxes_updated_at
BEFORE UPDATE ON public.inboxes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get inboxes
CREATE OR REPLACE FUNCTION public.get_inboxes()
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  department_id UUID,
  is_default BOOLEAN,
  auto_assignment_rules JSONB,
  color TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  conversation_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT 
    i.id,
    i.name,
    i.description,
    i.department_id,
    i.is_default,
    i.auto_assignment_rules,
    i.color,
    i.is_active,
    i.created_at,
    i.updated_at,
    COALESCE(conversation_counts.count, 0) as conversation_count
  FROM public.inboxes i
  LEFT JOIN (
    SELECT inbox_id, COUNT(*) as count
    FROM public.conversations 
    WHERE organization_id = public.get_user_organization_id()
    GROUP BY inbox_id
  ) conversation_counts ON i.id = conversation_counts.inbox_id
  WHERE i.organization_id = public.get_user_organization_id()
  ORDER BY i.is_default DESC, i.created_at ASC;
$function$;

-- Insert default inbox for existing organizations
INSERT INTO public.inboxes (organization_id, name, description, is_default, created_by_id)
SELECT DISTINCT 
  organization_id,
  'General Support',
  'Default inbox for customer support',
  true,
  (SELECT user_id FROM public.profiles WHERE organization_id = c.organization_id AND role = 'admin' LIMIT 1)
FROM public.conversations c
WHERE NOT EXISTS (
  SELECT 1 FROM public.inboxes WHERE organization_id = c.organization_id
);

-- Update existing conversations to use default inbox
UPDATE public.conversations 
SET inbox_id = (
  SELECT id FROM public.inboxes 
  WHERE organization_id = conversations.organization_id 
  AND is_default = true 
  LIMIT 1
)
WHERE inbox_id IS NULL;