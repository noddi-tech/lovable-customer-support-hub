
# Bulletproof Plan: Fix All 4 Security Errors

## Summary of the 4 Security Errors

| # | Finding | Severity | Risk |
|---|---------|----------|------|
| 1 | **Dev-login endpoint accessible in production** | ERROR | Anyone can request magic links for hardcoded emails |
| 2 | **Gmail sync User-Agent spoofing** | ERROR | Any request with `User-Agent: pg_net` bypasses auth |
| 3 | **Profiles table public exposure** | ERROR | Employee data (emails, names) visible across orgs |
| 4 | **Calls table public exposure** | ERROR | Customer phone numbers visible across orgs |

---

## Fix 1: Dev-Login Endpoint (SAFE - No Functionality Impact)

### Current Issue
The `dev-login` function is accessible in production and allows generating magic links without authentication.

### Solution
Add environment check to block production calls. This only affects manual developer testing workflows.

### File: `supabase/functions/dev-login/index.ts`

**Changes:**

```typescript
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY FIX: Block in production environment
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const isProduction = supabaseUrl.includes('qgfaycwsangsqzpveoup'); // Production project ID
  
  if (isProduction) {
    console.log('❌ Dev-login blocked in production');
    return new Response(
      JSON.stringify({ error: 'Endpoint not available in production' }), 
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ... rest of existing code
```

### Testing Steps
1. Deploy edge function
2. Attempt to call `/functions/v1/dev-login` in production
3. Verify 404 response is returned
4. Confirm development environment still works (if applicable)

**Impact on existing functionality:** ✅ NONE - This is a dev-only endpoint not used in production

---

## Fix 2: Gmail Sync User-Agent Bypass (SAFE - Minimal Impact)

### Current Issue
The function checks `User-Agent: pg_net` to detect cron jobs, but this is easily spoofed.

```typescript
// VULNERABLE CODE
const isServiceRoleCall = userAgent.includes('pg_net') || 
                          authHeader.includes('Bearer ' + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
```

### Solution
Remove User-Agent check entirely. Only verify actual service role key in Authorization header.

### File: `supabase/functions/gmail-sync/index.ts`

**Changes at lines 100-125:**

```typescript
// BEFORE (vulnerable):
const authHeader = req.headers.get('Authorization') || '';
const userAgent = req.headers.get('User-Agent') || '';
const isServiceRoleCall = userAgent.includes('pg_net') || authHeader.includes('Bearer ' + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

// AFTER (secure):
const authHeader = req.headers.get('Authorization') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Only verify actual service role key - remove User-Agent spoofing vulnerability
const isServiceRoleCall = serviceRoleKey && 
                          authHeader === `Bearer ${serviceRoleKey}`;

console.log('🔐 Authentication check:', {
  isServiceRoleCall,
  hasAuthHeader: !!authHeader,
  authType: isServiceRoleCall ? 'service_role' : 'user_token'
});
```

### Testing Steps
1. Deploy updated edge function
2. Test with User-Agent spoofing attempt:
   ```bash
   curl -X POST https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/gmail-sync \
     -H "User-Agent: pg_net" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
3. Verify 401 Unauthorized response (previously this would bypass auth)
4. Test legitimate user call with valid JWT → should work
5. Verify `trigger-gmail-sync` still works (it uses service role key properly)

**Impact on existing functionality:** ✅ NONE
- `trigger-gmail-sync` already passes the proper `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` header
- User-initiated syncs still work via JWT auth

---

## Fix 3: Profiles Table Exposure (REQUIRES CAREFUL AUDIT)

### Current Issue
The profiles table has multiple SELECT policies that allow viewing profiles across organizations:

```sql
-- PROBLEMATIC: Allows viewing any profile in accessible orgs (could be multiple)
CREATE POLICY "Users can view profiles in accessible organizations"
ON public.profiles FOR SELECT
USING (
  is_super_admin() OR 
  (organization_id IN (
    SELECT organization_memberships.organization_id
    FROM organization_memberships
    WHERE organization_memberships.user_id = auth.uid() 
      AND organization_memberships.status = 'active'
  ))
);
```

### Analysis of Current Usage
I analyzed 50 files using the profiles table. Key patterns:

1. **User's own profile** - Always uses `.eq('user_id', user.id)` 
2. **Users in same organization** - For assignment dropdowns, team lists
3. **Super admin access** - For user management across orgs

### Solution
The policies are actually **correct for multi-org support**. Users can belong to multiple organizations and need to see teammates in each.

**However**, we should:
1. Verify the scanner's concern is about unauthenticated access (it's not - requires auth.uid())
2. Mark this finding as appropriately secured given the business requirements

### Recommended Action
Mark this finding as "not applicable" since:
- RLS requires authentication (`auth.uid() IS NOT NULL` via organization_memberships join)
- Users can only see profiles within organizations they belong to
- This is correct behavior for multi-org/multi-tenant apps

**Impact on existing functionality:** ✅ NONE - No changes needed

### Alternative: If Stricter Isolation Required
If you want users to ONLY see profiles in their current/primary organization:

```sql
-- More restrictive: Only current organization
DROP POLICY "Users can view profiles in accessible organizations" ON public.profiles;

CREATE POLICY "Users can view profiles in current organization"
ON public.profiles FOR SELECT
USING (
  is_super_admin() OR 
  organization_id = get_user_organization_id()
);
```

**Impact:** Could break team/assignment features if users switch between organizations.

---

## Fix 4: Calls Table Exposure (REQUIRES CAREFUL AUDIT)

### Current Issue
Similar to profiles - the calls table allows viewing calls across accessible organizations.

### Current Policy:
```sql
CREATE POLICY "Users can view calls in accessible organizations"
ON public.calls FOR SELECT
USING (
  is_super_admin() OR 
  (organization_id IN (
    SELECT organization_memberships.organization_id
    FROM organization_memberships
    WHERE organization_memberships.user_id = auth.uid() 
      AND organization_memberships.status = 'active'
  ))
);
```

### Analysis
This policy:
- ✅ Requires authentication
- ✅ Scopes to organizations user belongs to
- ✅ Is consistent with multi-org support

### Solution
Same as profiles - this is correctly scoped for multi-org. Mark finding as addressed.

**Impact on existing functionality:** ✅ NONE - No changes needed

### Alternative: If Stricter Isolation Required
```sql
DROP POLICY "Users can view calls in accessible organizations" ON public.calls;

CREATE POLICY "Users can view calls in current organization"
ON public.calls FOR SELECT
USING (
  is_super_admin() OR 
  organization_id = get_user_organization_id()
);
```

**Impact:** Users would only see calls from their current organization context.

---

## Implementation Order

| Step | Fix | Files | Risk | Testing |
|------|-----|-------|------|---------|
| 1 | Dev-login production block | `supabase/functions/dev-login/index.ts` | Zero | Call endpoint, expect 404 |
| 2 | Gmail sync auth fix | `supabase/functions/gmail-sync/index.ts` | Zero | Spoofing test, cron test |
| 3 | Review profiles RLS | Database policies (optional) | Medium | Full app test if changed |
| 4 | Review calls RLS | Database policies (optional) | Medium | Full app test if changed |

---

## Post-Fix Testing Checklist

### After Fix 1 (Dev-Login)
- [ ] Production call returns 404
- [ ] No impact on regular login flows

### After Fix 2 (Gmail Sync)
- [ ] User-Agent spoofing returns 401
- [ ] Authenticated user can trigger manual sync
- [ ] Cron job via `trigger-gmail-sync` still works

### After Fixes 3 & 4 (If RLS Changed)
- [ ] User can see own profile in settings
- [ ] User can see teammates in assignment dropdown
- [ ] User can view call history
- [ ] Analytics dashboards work
- [ ] Admin can manage users
- [ ] Super admin can view all data

---

## Security Finding Cleanup

After implementing fixes 1 and 2, we should update the security findings:

```typescript
// Delete fixed findings
{ operation: "delete", internal_id: "dev_login_production", scanner_name: "agent_security" }
{ operation: "delete", internal_id: "gmail_sync_user_agent_bypass", scanner_name: "agent_security" }

// Mark RLS findings as acceptable for multi-org design
{ 
  operation: "update", 
  internal_id: "profiles_table_public_exposure",
  scanner_name: "supabase_lov",
  finding: {
    ignore: true,
    ignore_reason: "RLS requires authentication and scopes to user's organization memberships. This is correct for multi-org support."
  }
}
{ 
  operation: "update", 
  internal_id: "calls_table_public_exposure",
  scanner_name: "supabase_lov",
  finding: {
    ignore: true,
    ignore_reason: "RLS requires authentication and scopes to user's organization memberships. This is correct for multi-org support."
  }
}
```

---

## Summary

| Finding | Action | Impact | Effort |
|---------|--------|--------|--------|
| Dev-login in production | Add env check | None | 5 min |
| Gmail sync spoofing | Remove User-Agent check | None | 10 min |
| Profiles RLS | Mark as acceptable (or tighten if needed) | None/Medium | 0-30 min |
| Calls RLS | Mark as acceptable (or tighten if needed) | None/Medium | 0-30 min |

**Recommendation:** Implement fixes 1 and 2 immediately (zero risk). For fixes 3 and 4, the current RLS is correct for multi-org - mark findings as acceptable unless you want stricter single-org isolation.
