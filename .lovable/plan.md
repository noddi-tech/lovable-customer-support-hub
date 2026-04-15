

# Security Fixes Plan — 6 Critical Findings

## Overview

Six database-level security issues to fix via a single SQL migration. No frontend code changes needed — all fixes are at the RLS policy level.

---

## 1. Broken RLS on `customer_memories` (cross-org access)

**Problem:** Policies reference `customer_memories.organization_id` inside a subquery on `user_roles` (which has no `organization_id` column), so Postgres resolves it as a correlated reference to the outer row — effectively `WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid())`.

**Fix:** Replace all 3 policies (SELECT, INSERT, UPDATE) to use `organization_memberships`:

```sql
DROP POLICY "Users can view memories in their org" ON customer_memories;
DROP POLICY "Users can insert memories in their org" ON customer_memories;
DROP POLICY "Users can update memories in their org" ON customer_memories;

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
```

**Risk:** Low. Agents already belong to organizations via `organization_memberships`. Edge functions use service_role which bypasses RLS.

---

## 2. Email OAuth tokens exposed to all org members

**Problem:** SELECT policy on `email_accounts` lets any org member read `access_token` and `refresh_token`.

**Fix:** Restrict SELECT to admins/super_admins only. Non-admin reads already go through the `get_email_accounts` RPC (SECURITY DEFINER) which excludes token columns.

```sql
DROP POLICY "Users can view email accounts in accessible organizations" ON email_accounts;

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
```

**Risk:** Low. Non-admin agent queries use `get_email_accounts` RPC or join through foreign keys (which don't expose token columns). The few direct `.from('email_accounts').select('id, provider, is_active')` queries in admin components will still work since admins have access.

---

## 3. PII exposure via public knowledge search

**Status:** Already mitigated (endpoints disabled). Mark finding as acknowledged — the fix is the ongoing PII sanitization effort, not a policy change.

**Action:** No SQL change. Mark finding status via security tool.

---

## 4. Notifications INSERT allows targeting any user

**Problem:** `System can insert notifications` policy has `WITH CHECK (true)` on `public` role.

**Fix:** Drop the overly permissive policy. The existing `Users can insert their own notifications` policy (`WITH CHECK (user_id = auth.uid())`) covers legitimate client-side inserts. Edge functions (call notifications, etc.) use service_role which bypasses RLS.

```sql
DROP POLICY "System can insert notifications" ON notifications;
```

**Risk:** Low. Edge functions like `create-call-notification` use `createClient(URL, SERVICE_ROLE_KEY)` which bypasses RLS entirely.

---

## 5. Webhook retry queue fully open

**Problem:** `System can manage webhook queue` grants ALL to `public` with `USING (true)`.

**Fix:** Drop the public policy. Only edge functions (using service_role) need access. The table is empty and only used by backend functions.

```sql
DROP POLICY "System can manage webhook queue" ON webhook_retry_queue;
```

**Risk:** None. No frontend code reads this table. All access is via service_role in edge functions.

---

## 6. RLS disabled on `preference_pairs`

**Problem:** `preference_pairs` table has RLS disabled.

**Fix:** Enable RLS and add org-scoped policy:

```sql
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
```

**Risk:** Low. This table is used for AI training data, primarily written by edge functions (service_role).

---

## Summary

| Finding | Action | Risk |
|---------|--------|------|
| customer_memories broken RLS | Replace 3 policies with org-membership check | Low |
| email_accounts tokens exposed | Restrict SELECT to admins only | Low |
| PII in knowledge search | Already mitigated, acknowledge | None |
| notifications open INSERT | Drop overly permissive policy | Low |
| webhook_retry_queue open | Drop public policy | None |
| preference_pairs no RLS | Enable RLS + add policies | Low |

**Files to modify:** One SQL migration covering all policy changes. No frontend code changes.

