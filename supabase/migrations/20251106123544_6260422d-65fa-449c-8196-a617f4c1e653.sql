-- Add missing DELETE RLS policies for complete security coverage

-- Organizations: Only super admins can delete
CREATE POLICY "Super admins can delete organizations"
ON organizations
FOR DELETE
TO authenticated
USING (is_super_admin());

-- Call Events: Admins can delete in their organization
CREATE POLICY "Admins can delete call events in their organization"
ON call_events
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM calls c
    WHERE c.id = call_events.call_id
      AND c.organization_id = get_user_organization_id()
      AND has_permission(auth.uid(), 'manage_settings'::app_permission)
  )
);

-- Calls: Admins can delete in their organization
CREATE POLICY "Admins can delete calls in their organization"
ON calls
FOR DELETE
TO authenticated
USING (
  (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission))
  OR is_super_admin()
);

-- Customers: Admins can delete in their organization
CREATE POLICY "Admins can delete customers in their organization"
ON customers
FOR DELETE
TO authenticated
USING (
  (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission))
  OR is_super_admin()
);

-- Internal Events: Admins can delete in their organization
CREATE POLICY "Admins can delete internal events in their organization"
ON internal_events
FOR DELETE
TO authenticated
USING (
  organization_id = get_user_organization_id()
  AND has_permission(auth.uid(), 'manage_settings'::app_permission)
);

-- Knowledge Patterns: Admins can delete in their organization
CREATE POLICY "Admins can delete knowledge patterns in their organization"
ON knowledge_patterns
FOR DELETE
TO authenticated
USING (
  organization_id = get_user_organization_id()
  AND has_permission(auth.uid(), 'manage_settings'::app_permission)
);