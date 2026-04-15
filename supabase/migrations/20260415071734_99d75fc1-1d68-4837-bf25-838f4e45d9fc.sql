
-- 1. Fix customer_memories broken RLS policies
DROP POLICY IF EXISTS "Users can view memories in their org" ON customer_memories;
DROP POLICY IF EXISTS "Users can insert memories in their org" ON customer_memories;
DROP POLICY IF EXISTS "Users can update memories in their org" ON customer_memories;

CREATE POLICY "Users can view memories in their org" ON customer_memories FOR SELECT
USING (organization_id IN (
  SELECT om.organization_id FROM organization_memberships om
  WHERE om.user_id = auth.uid() AND om.status = 'active'
));

CREATE POLICY "Users can insert memories in their org" ON customer_memories FOR INSERT
WITH CHECK (organization_id IN (
  SELECT om.organization_id FROM organization_memberships om
  WHERE om.user_id = auth.uid() AND om.status = 'active'
));

CREATE POLICY "Users can update memories in their org" ON customer_memories FOR UPDATE
USING (organization_id IN (
  SELECT om.organization_id FROM organization_memberships om
  WHERE om.user_id = auth.uid() AND om.status = 'active'
));

-- 2. Restrict email_accounts SELECT to admins only
DROP POLICY IF EXISTS "Users can view email accounts in accessible organizations" ON email_accounts;

CREATE POLICY "Admins can view email accounts in accessible organizations" ON email_accounts FOR SELECT
USING (
  is_super_admin() OR (
    organization_id IN (
      SELECT om.organization_id FROM organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
        AND om.role IN ('admin', 'super_admin')
    )
  )
);

-- 3. Drop overly permissive notifications INSERT policy
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- 4. Drop overly permissive webhook_retry_queue policy
DROP POLICY IF EXISTS "System can manage webhook queue" ON webhook_retry_queue;

-- 5. Enable RLS on preference_pairs and add org-scoped policies
ALTER TABLE preference_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view preference pairs in their org" ON preference_pairs FOR SELECT
USING (organization_id IN (
  SELECT om.organization_id FROM organization_memberships om
  WHERE om.user_id = auth.uid() AND om.status = 'active'
));

CREATE POLICY "Users can insert preference pairs in their org" ON preference_pairs FOR INSERT
WITH CHECK (organization_id IN (
  SELECT om.organization_id FROM organization_memberships om
  WHERE om.user_id = auth.uid() AND om.status = 'active'
));
