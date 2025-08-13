-- Helper: current user's department
CREATE OR REPLACE FUNCTION public.get_user_department_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT department_id FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- Trigger to set conversation.department_id from inbox
CREATE OR REPLACE FUNCTION public.set_conversation_department_from_inbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.inbox_id IS NOT NULL THEN
    SELECT department_id INTO NEW.department_id
    FROM public.inboxes
    WHERE id = NEW.inbox_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_conversation_department_from_inbox ON public.conversations;
CREATE TRIGGER trg_set_conversation_department_from_inbox
BEFORE INSERT OR UPDATE OF inbox_id
ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.set_conversation_department_from_inbox();

-- Backfill existing conversations' department from inbox
UPDATE public.conversations c
SET department_id = i.department_id
FROM public.inboxes i
WHERE c.inbox_id = i.id AND (c.department_id IS DISTINCT FROM i.department_id);

-- Tighten inbox visibility: department-scoped (admins with manage_settings can see all)
DROP POLICY IF EXISTS "Users can view inboxes in their organization" ON public.inboxes;
CREATE POLICY "Users can view inboxes in their department or org-wide"
ON public.inboxes
FOR SELECT
USING (
  organization_id = public.get_user_organization_id()
  AND (
    public.has_permission(auth.uid(), 'manage_settings'::app_permission)
    OR department_id IS NULL
    OR department_id = public.get_user_department_id()
  )
);

-- Conversations: department-scoped visibility and mutation (users with view_all_conversations can access all)
DROP POLICY IF EXISTS "Users can view conversations in their organization" ON public.conversations;
CREATE POLICY "Users can view conversations in allowed department"
ON public.conversations
FOR SELECT
USING (
  organization_id = public.get_user_organization_id()
  AND (
    public.has_permission(auth.uid(), 'view_all_conversations'::app_permission)
    OR department_id IS NULL
    OR department_id = public.get_user_department_id()
  )
);

DROP POLICY IF EXISTS "Users can insert conversations in their organization" ON public.conversations;
CREATE POLICY "Users can insert conversations in allowed department"
ON public.conversations
FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND (
    public.has_permission(auth.uid(), 'view_all_conversations'::app_permission)
    OR department_id IS NULL
    OR department_id = public.get_user_department_id()
  )
);

DROP POLICY IF EXISTS "Users can update conversations in their organization" ON public.conversations;
CREATE POLICY "Users can update conversations in allowed department"
ON public.conversations
FOR UPDATE
USING (
  organization_id = public.get_user_organization_id()
  AND (
    public.has_permission(auth.uid(), 'view_all_conversations'::app_permission)
    OR department_id IS NULL
    OR department_id = public.get_user_department_id()
  )
)
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND (
    public.has_permission(auth.uid(), 'view_all_conversations'::app_permission)
    OR department_id IS NULL
    OR department_id = public.get_user_department_id()
  )
);

DROP POLICY IF EXISTS "Users can delete conversations in their organization" ON public.conversations;
CREATE POLICY "Users can delete conversations in allowed department"
ON public.conversations
FOR DELETE
USING (
  organization_id = public.get_user_organization_id()
  AND (
    public.has_permission(auth.uid(), 'view_all_conversations'::app_permission)
    OR department_id IS NULL
    OR department_id = public.get_user_department_id()
  )
);

-- Messages: align with conversation access
DROP POLICY IF EXISTS "Users can view messages in their organization conversations" ON public.messages;
CREATE POLICY "Users can view messages in allowed department conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.organization_id = public.get_user_organization_id()
      AND (
        public.has_permission(auth.uid(), 'view_all_conversations'::app_permission)
        OR c.department_id IS NULL
        OR c.department_id = public.get_user_department_id()
      )
  )
);

DROP POLICY IF EXISTS "Users can insert messages in their organization conversations" ON public.messages;
CREATE POLICY "Users can insert messages in allowed department conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.organization_id = public.get_user_organization_id()
      AND (
        public.has_permission(auth.uid(), 'view_all_conversations'::app_permission)
        OR c.department_id IS NULL
        OR c.department_id = public.get_user_department_id()
      )
  )
);

DROP POLICY IF EXISTS "Users can update messages in their organization conversations" ON public.messages;
CREATE POLICY "Users can update messages in allowed department conversations"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.organization_id = public.get_user_organization_id()
      AND (
        public.has_permission(auth.uid(), 'view_all_conversations'::app_permission)
        OR c.department_id IS NULL
        OR c.department_id = public.get_user_department_id()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.organization_id = public.get_user_organization_id()
      AND (
        public.has_permission(auth.uid(), 'view_all_conversations'::app_permission)
        OR c.department_id IS NULL
        OR c.department_id = public.get_user_department_id()
      )
  )
);

DROP POLICY IF EXISTS "Users can delete messages in their organization conversations" ON public.messages;
CREATE POLICY "Users can delete messages in allowed department conversations"
ON public.messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.organization_id = public.get_user_organization_id()
      AND (
        public.has_permission(auth.uid(), 'view_all_conversations'::app_permission)
        OR c.department_id IS NULL
        OR c.department_id = public.get_user_department_id()
      )
  )
);