

# Security Fixes — Voicemails, Widget Tables, Realtime

## Overview
Three security findings to address via one SQL migration plus a manual Dashboard step.

---

## 1. Voicemails publicly accessible

**Problem:** `Voicemails are publicly accessible` storage policy grants unauthenticated read access. Permissive OR logic overrides restrictive policies.

**Fix:** Drop the public policy and set bucket to private. All voicemail access goes through `download-voicemail` edge function (service_role), so no functionality breaks.

```sql
DROP POLICY IF EXISTS "Voicemails are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage voicemails" ON storage.objects;
UPDATE storage.buckets SET public = false WHERE id = 'voicemails';

CREATE POLICY "Org members can read voicemails" ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'voicemails');
```

**Risk:** None. Frontend uses `download-voicemail` edge function, not direct bucket access.

---

## 2. Widget tables overly permissive RLS

**Problem:** Migration `20260121192814` attempted to fix this but the scanner still flags it — likely because the old `USING(true)` policies from `20260121151357` weren't successfully dropped, or additional permissive policies exist. The fix migration needs to be re-applied defensively.

**Fix:** Re-drop any remaining permissive policies and ensure only org-scoped policies exist:

```sql
-- Defensive cleanup of any remaining permissive policies
DROP POLICY IF EXISTS "Service role has full access to chat sessions" ON widget_chat_sessions;
DROP POLICY IF EXISTS "Service role has full access to typing indicators" ON chat_typing_indicators;

-- Re-create org-scoped policies (DROP IF EXISTS first to be idempotent)
DROP POLICY IF EXISTS "Authenticated users can view chat sessions in their org" ON widget_chat_sessions;
DROP POLICY IF EXISTS "Authenticated users can update chat sessions in their org" ON widget_chat_sessions;
DROP POLICY IF EXISTS "Authenticated users can view typing indicators in their org" ON chat_typing_indicators;
DROP POLICY IF EXISTS "Authenticated users can manage typing indicators in their org" ON chat_typing_indicators;

CREATE POLICY "Authenticated users can view chat sessions in their org"
ON widget_chat_sessions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM widget_configs wc
  JOIN organization_memberships om ON om.organization_id = wc.organization_id
  WHERE wc.id = widget_chat_sessions.widget_config_id
  AND om.user_id = auth.uid() AND om.status = 'active'
));

CREATE POLICY "Authenticated users can update chat sessions in their org"
ON widget_chat_sessions FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM widget_configs wc
  JOIN organization_memberships om ON om.organization_id = wc.organization_id
  WHERE wc.id = widget_chat_sessions.widget_config_id
  AND om.user_id = auth.uid() AND om.status = 'active'
));

CREATE POLICY "Authenticated users can view typing indicators in their org"
ON chat_typing_indicators FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversations c
  JOIN organization_memberships om ON om.organization_id = c.organization_id
  WHERE c.id = chat_typing_indicators.conversation_id
  AND om.user_id = auth.uid() AND om.status = 'active'
));

CREATE POLICY "Authenticated users can manage typing indicators in their org"
ON chat_typing_indicators FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversations c
  JOIN organization_memberships om ON om.organization_id = c.organization_id
  WHERE c.id = chat_typing_indicators.conversation_id
  AND om.user_id = auth.uid() AND om.status = 'active'
));
```

**Risk:** Low. Agent-side code uses authenticated client (scoped by org). Widget visitor-side uses `widget-chat` edge function with service_role (bypasses RLS). Session creation/deletion is done by edge functions only.

---

## 3. Realtime data broadcast (no channel authorization)

**Problem:** Any authenticated user can subscribe to Realtime channels and receive events for tables across all organizations.

**Fix:** This requires enabling **Realtime Authorization** in the Supabase Dashboard. All published tables already have org-scoped RLS SELECT policies, so once enabled, Realtime will filter events to only rows the user can SELECT.

**Action:** Manual — go to Supabase Dashboard > Database > Replication and enable Realtime Authorization. No SQL migration needed.

---

## Summary

| Finding | Action | Risk |
|---------|--------|------|
| Voicemails public | Drop public policy, set bucket private | None |
| Widget tables permissive | Re-apply org-scoped policies, drop any remaining USING(true) | Low |
| Realtime broadcast | Enable Realtime Authorization in Dashboard | Low |

**Files to modify:** One SQL migration covering voicemail + widget table policies. No frontend code changes.

**User action required:** Enable Realtime Authorization in Supabase Dashboard.

