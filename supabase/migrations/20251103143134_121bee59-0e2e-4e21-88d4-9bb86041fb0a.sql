-- Part 2: Create/Update Helper Functions and RLS Policies

-- Update get_user_organization_id to use memberships and respect context
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- First check if there's a context organization set (for super admins switching orgs)
  SELECT COALESCE(
    -- Try to get from context first (will implement in app layer)
    (SELECT organization_id FROM organization_memberships 
     WHERE user_id = auth.uid() AND is_default = true LIMIT 1),
    -- Fallback to first membership
    (SELECT organization_id FROM organization_memberships 
     WHERE user_id = auth.uid() AND status = 'active' LIMIT 1)
  );
$$;

-- Create function to check if user is member of organization
CREATE OR REPLACE FUNCTION public.is_organization_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND status = 'active'
  ) OR is_super_admin();
$$;

-- Add RLS policies for organization_memberships table
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all memberships"
ON public.organization_memberships
FOR SELECT
USING (is_super_admin());

CREATE POLICY "Super admins can insert memberships"
ON public.organization_memberships
FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update memberships"
ON public.organization_memberships
FOR UPDATE
USING (is_super_admin());

CREATE POLICY "Super admins can delete memberships"
ON public.organization_memberships
FOR DELETE
USING (is_super_admin());

CREATE POLICY "Users can view their own memberships"
ON public.organization_memberships
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Org admins can view memberships in their org"
ON public.organization_memberships
FOR SELECT
USING (
  has_permission(auth.uid(), 'manage_users') 
  AND organization_id = get_user_organization_id()
);

CREATE POLICY "Org admins can insert memberships in their org"
ON public.organization_memberships
FOR INSERT
WITH CHECK (
  has_permission(auth.uid(), 'manage_users') 
  AND organization_id = get_user_organization_id()
);

CREATE POLICY "Org admins can update memberships in their org"
ON public.organization_memberships
FOR UPDATE
USING (
  has_permission(auth.uid(), 'manage_users') 
  AND organization_id = get_user_organization_id()
);

CREATE POLICY "Org admins can delete memberships in their org"
ON public.organization_memberships
FOR DELETE
USING (
  has_permission(auth.uid(), 'manage_users') 
  AND organization_id = get_user_organization_id()
);

-- Update RLS policies on key tables to support multi-org access for super admins

-- Organizations table
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
CREATE POLICY "Users can view their organizations"
ON public.organizations
FOR SELECT
USING (
  is_super_admin() OR 
  id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
);

DROP POLICY IF EXISTS "Users can update their own organization" ON public.organizations;
CREATE POLICY "Admins can update their organizations"
ON public.organizations
FOR UPDATE
USING (
  is_super_admin() OR 
  (id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'))
)
WITH CHECK (
  is_super_admin() OR 
  (id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'))
);

-- Super admins can create organizations
CREATE POLICY "Super admins can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (is_super_admin());

-- Profiles table
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
CREATE POLICY "Users can view profiles in accessible organizations"
ON public.profiles
FOR SELECT
USING (
  is_super_admin() OR 
  organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
);

-- Conversations table
DROP POLICY IF EXISTS "Users can view conversations in allowed department" ON public.conversations;
CREATE POLICY "Users can view conversations in accessible organizations"
ON public.conversations
FOR SELECT
USING (
  is_super_admin() OR
  (
    organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
    AND (
      has_permission(auth.uid(), 'view_all_conversations') OR 
      (department_id IS NULL) OR 
      (department_id = get_user_department_id())
    )
  )
);

DROP POLICY IF EXISTS "Users can insert conversations in allowed department" ON public.conversations;
CREATE POLICY "Users can insert conversations in accessible organizations"
ON public.conversations
FOR INSERT
WITH CHECK (
  is_super_admin() OR
  (
    organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
    AND organization_id = get_user_organization_id()
    AND (
      has_permission(auth.uid(), 'view_all_conversations') OR 
      (department_id IS NULL) OR 
      (department_id = get_user_department_id())
    )
  )
);

DROP POLICY IF EXISTS "Users can update conversations in allowed department" ON public.conversations;
CREATE POLICY "Users can update conversations in accessible organizations"
ON public.conversations
FOR UPDATE
USING (
  is_super_admin() OR
  (
    organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
    AND (
      has_permission(auth.uid(), 'view_all_conversations') OR 
      (department_id IS NULL) OR 
      (department_id = get_user_department_id())
    )
  )
)
WITH CHECK (
  is_super_admin() OR
  (
    organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
    AND organization_id = get_user_organization_id()
    AND (
      has_permission(auth.uid(), 'view_all_conversations') OR 
      (department_id IS NULL) OR 
      (department_id = get_user_department_id())
    )
  )
);

DROP POLICY IF EXISTS "Users can delete conversations in allowed department" ON public.conversations;
CREATE POLICY "Users can delete conversations in accessible organizations"
ON public.conversations
FOR DELETE
USING (
  is_super_admin() OR
  (
    organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
    AND organization_id = get_user_organization_id()
    AND (
      has_permission(auth.uid(), 'view_all_conversations') OR 
      (department_id IS NULL) OR 
      (department_id = get_user_department_id())
    )
  )
);

-- Departments table
DROP POLICY IF EXISTS "Users can view departments in their organization" ON public.departments;
CREATE POLICY "Users can view departments in accessible organizations"
ON public.departments
FOR SELECT
USING (
  is_super_admin() OR
  organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
);

DROP POLICY IF EXISTS "Users can create departments in their organization" ON public.departments;
CREATE POLICY "Users can create departments in accessible organizations"
ON public.departments
FOR INSERT
WITH CHECK (
  is_super_admin() OR
  (organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
   AND organization_id = get_user_organization_id()
   AND has_permission(auth.uid(), 'manage_departments'))
);

DROP POLICY IF EXISTS "Users can update departments in their organization" ON public.departments;
CREATE POLICY "Users can update departments in accessible organizations"
ON public.departments
FOR UPDATE
USING (
  is_super_admin() OR
  (organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
   AND organization_id = get_user_organization_id()
   AND has_permission(auth.uid(), 'manage_departments'))
)
WITH CHECK (
  is_super_admin() OR
  (organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
   AND organization_id = get_user_organization_id()
   AND has_permission(auth.uid(), 'manage_departments'))
);

DROP POLICY IF EXISTS "Users can delete departments in their organization" ON public.departments;
CREATE POLICY "Users can delete departments in accessible organizations"
ON public.departments
FOR DELETE
USING (
  is_super_admin() OR
  (organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
   AND organization_id = get_user_organization_id()
   AND has_permission(auth.uid(), 'manage_departments'))
);

-- Inboxes table
DROP POLICY IF EXISTS "Users can view inboxes in their department or org-wide" ON public.inboxes;
CREATE POLICY "Users can view inboxes in accessible organizations"
ON public.inboxes
FOR SELECT
USING (
  is_super_admin() OR
  (
    organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
    AND (
      has_permission(auth.uid(), 'manage_settings') OR 
      (department_id IS NULL) OR 
      (department_id = get_user_department_id())
    )
  )
);

DROP POLICY IF EXISTS "Users can create inboxes in their organization" ON public.inboxes;
CREATE POLICY "Users can create inboxes in accessible organizations"
ON public.inboxes
FOR INSERT
WITH CHECK (
  is_super_admin() OR
  (organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
   AND organization_id = get_user_organization_id()
   AND has_permission(auth.uid(), 'manage_inboxes'))
);

DROP POLICY IF EXISTS "Users can update inboxes in their organization" ON public.inboxes;
CREATE POLICY "Users can update inboxes in accessible organizations"
ON public.inboxes
FOR UPDATE
USING (
  is_super_admin() OR
  (organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
   AND organization_id = get_user_organization_id()
   AND has_permission(auth.uid(), 'manage_inboxes'))
);

DROP POLICY IF EXISTS "Users can delete inboxes in their organization" ON public.inboxes;
CREATE POLICY "Users can delete inboxes in accessible organizations"
ON public.inboxes
FOR DELETE
USING (
  is_super_admin() OR
  (organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
   AND organization_id = get_user_organization_id()
   AND has_permission(auth.uid(), 'manage_inboxes'))
);

-- Calls table
DROP POLICY IF EXISTS "Users can view calls in their organization" ON public.calls;
CREATE POLICY "Users can view calls in accessible organizations"
ON public.calls
FOR SELECT
USING (
  is_super_admin() OR
  organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
);

DROP POLICY IF EXISTS "Users can insert calls in their organization" ON public.calls;
CREATE POLICY "Users can insert calls in accessible organizations"
ON public.calls
FOR INSERT
WITH CHECK (
  is_super_admin() OR
  (organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
   AND organization_id = get_user_organization_id())
);

DROP POLICY IF EXISTS "Users can update calls in their organization" ON public.calls;
CREATE POLICY "Users can update calls in accessible organizations"
ON public.calls
FOR UPDATE
USING (
  is_super_admin() OR
  (organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
   AND organization_id = get_user_organization_id())
);

-- Customers table
DROP POLICY IF EXISTS "Users can view customers they interact with" ON public.customers;
CREATE POLICY "Users can view customers in accessible organizations"
ON public.customers
FOR SELECT
USING (
  is_super_admin() OR
  (
    organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
    AND (
      has_permission(auth.uid(), 'view_all_conversations') OR 
      (EXISTS ( SELECT 1
       FROM conversations c
      WHERE ((c.customer_id = customers.id) AND ((c.assigned_to_id = auth.uid()) OR (c.department_id = get_user_department_id())))))
    )
  )
);

DROP POLICY IF EXISTS "Users can insert customers in their organization" ON public.customers;
CREATE POLICY "Users can insert customers in accessible organizations"
ON public.customers
FOR INSERT
WITH CHECK (
  is_super_admin() OR
  (organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
   AND organization_id = get_user_organization_id())
);

DROP POLICY IF EXISTS "Users can update customers in their organization" ON public.customers;
CREATE POLICY "Users can update customers in accessible organizations"
ON public.customers
FOR UPDATE
USING (
  is_super_admin() OR
  (organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
   AND organization_id = get_user_organization_id())
);

-- Email accounts table
DROP POLICY IF EXISTS "Users can view email accounts in their organization" ON public.email_accounts;
CREATE POLICY "Users can view email accounts in accessible organizations"
ON public.email_accounts
FOR SELECT
USING (
  is_super_admin() OR
  organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
);

DROP POLICY IF EXISTS "Users can insert email accounts in their organization" ON public.email_accounts;
CREATE POLICY "Users can insert email accounts in accessible organizations"
ON public.email_accounts
FOR INSERT
WITH CHECK (
  is_super_admin() OR
  (organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
   AND organization_id = get_user_organization_id())
);

DROP POLICY IF EXISTS "Users can update email accounts in their organization" ON public.email_accounts;
CREATE POLICY "Users can update email accounts in accessible organizations"
ON public.email_accounts
FOR UPDATE
USING (
  is_super_admin() OR
  (organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
   AND organization_id = get_user_organization_id())
);

DROP POLICY IF EXISTS "Users can delete email accounts in their organization" ON public.email_accounts;
CREATE POLICY "Users can delete email accounts in accessible organizations"
ON public.email_accounts
FOR DELETE
USING (
  is_super_admin() OR
  (organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
   AND organization_id = get_user_organization_id())
);