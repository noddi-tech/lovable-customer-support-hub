-- Step 1: Create performance indexes for RLS policy optimization
CREATE INDEX IF NOT EXISTS idx_conversations_org_dept_id 
ON public.conversations (organization_id, department_id, id);

CREATE INDEX IF NOT EXISTS idx_conversations_org_id 
ON public.conversations (organization_id, id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_org_dept 
ON public.profiles (user_id, organization_id, department_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON public.messages (conversation_id);

-- Step 2: Create a simpler, cached function for user organization data
CREATE OR REPLACE FUNCTION public.get_user_org_cache()
RETURNS TABLE(org_id uuid, dept_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT p.organization_id, p.department_id
  FROM public.profiles p 
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;