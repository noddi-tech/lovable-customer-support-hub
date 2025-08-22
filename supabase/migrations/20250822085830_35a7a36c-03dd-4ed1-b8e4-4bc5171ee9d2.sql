-- Step 1: Create performance indexes for RLS policy optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_org_dept_id 
ON public.conversations (organization_id, department_id, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_org_id 
ON public.conversations (organization_id, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_org_dept 
ON public.profiles (user_id, organization_id, department_id);

-- Step 2: Create optimized security definer functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_org_and_dept()
RETURNS TABLE(org_id uuid, dept_id uuid, has_view_all boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT 
    p.organization_id,
    p.department_id,
    has_permission(auth.uid(), 'view_all_conversations'::app_permission)
  FROM public.profiles p 
  WHERE p.user_id = auth.uid();
$$;

-- Step 3: Replace the inefficient messages RLS policies with optimized ones
DROP POLICY IF EXISTS "Users can view messages in allowed department conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in allowed department conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in allowed department conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages in allowed department conversations" ON public.messages;

-- Create optimized policies using direct joins instead of EXISTS subqueries
CREATE POLICY "Optimized: Users can view messages in allowed conversations" 
ON public.messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.get_user_org_and_dept() u ON (
      c.organization_id = u.org_id AND
      (u.has_view_all OR c.department_id IS NULL OR c.department_id = u.dept_id)
    )
    WHERE c.id = messages.conversation_id
  )
);

CREATE POLICY "Optimized: Users can insert messages in allowed conversations" 
ON public.messages FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.get_user_org_and_dept() u ON (
      c.organization_id = u.org_id AND
      (u.has_view_all OR c.department_id IS NULL OR c.department_id = u.dept_id)
    )
    WHERE c.id = messages.conversation_id
  )
);

CREATE POLICY "Optimized: Users can update messages in allowed conversations" 
ON public.messages FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.get_user_org_and_dept() u ON (
      c.organization_id = u.org_id AND
      (u.has_view_all OR c.department_id IS NULL OR c.department_id = u.dept_id)
    )
    WHERE c.id = messages.conversation_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.get_user_org_and_dept() u ON (
      c.organization_id = u.org_id AND
      (u.has_view_all OR c.department_id IS NULL OR c.department_id = u.dept_id)
    )
    WHERE c.id = messages.conversation_id
  )
);

CREATE POLICY "Optimized: Users can delete messages in allowed conversations" 
ON public.messages FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    INNER JOIN public.get_user_org_and_dept() u ON (
      c.organization_id = u.org_id AND
      (u.has_view_all OR c.department_id IS NULL OR c.department_id = u.dept_id)
    )
    WHERE c.id = messages.conversation_id
  )
);