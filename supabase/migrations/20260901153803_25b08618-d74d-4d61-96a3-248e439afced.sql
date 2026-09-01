-- 1. call_events: require elevated permission to insert
DROP POLICY IF EXISTS "Users can insert call events in their organization" ON public.call_events;
CREATE POLICY "Admins can insert call events in their organization"
ON public.call_events FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.calls c
  WHERE c.id = call_events.call_id
    AND c.organization_id = public.get_user_organization_id()
    AND public.has_permission(auth.uid(), 'manage_settings'::app_permission)
));

-- 2. debug_logs: super admins only
DROP POLICY IF EXISTS "Only admins can view debug logs" ON public.debug_logs;
DROP POLICY IF EXISTS "Only admins can insert debug logs" ON public.debug_logs;
CREATE POLICY "Super admins can view debug logs"
ON public.debug_logs FOR SELECT TO authenticated
USING (public.is_super_admin());
CREATE POLICY "Super admins can insert debug logs"
ON public.debug_logs FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin());

-- 3. note_templates: use user_roles-backed helpers instead of profiles.role
DROP POLICY IF EXISTS "Users can delete note templates they created" ON public.note_templates;
CREATE POLICY "Users can delete note templates they created"
ON public.note_templates FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_org_admin(organization_id)
);

DROP POLICY IF EXISTS "Users can update note templates they created or global ones in " ON public.note_templates;
CREATE POLICY "Users can update note templates they created or global ones"
ON public.note_templates FOR UPDATE TO authenticated
USING (
  public.is_org_member(organization_id)
  AND (created_by = auth.uid() OR public.is_org_admin(organization_id))
)
WITH CHECK (
  public.is_org_member(organization_id)
  AND (created_by = auth.uid() OR public.is_org_admin(organization_id))
);

-- 4. Revoke anon EXECUTE on internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.current_profile_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_inboxes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_online_agent_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_department_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_organization_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_profile_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_profile_roles(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, app_permission) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_any_role(uuid, text[]) FROM anon;