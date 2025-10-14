# Security Fixes Implementation Guide

This document outlines all security fixes applied to address the Supabase security scan findings.

## ✅ Phase 1: Database Security (COMPLETED)

### 1.1 Function Search Path Protection
**Issue:** Functions without `SET search_path` are vulnerable to search path hijacking.

**Fix Applied:**
- Updated 3 functions to include `SET search_path = public`:
  - `set_voice_integration_organization_id()`
  - `log_message_insertion()`
  - `enrich_call_from_events()`

**Verification:**
```sql
-- Check all functions have search_path set
SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  p.proconfig
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
AND p.proconfig IS NULL;
-- Should return empty or only system functions
```

### 1.2 Debug Logs Sanitization
**Issue:** Debug logs may contain API keys, tokens, and sensitive customer data.

**Fix Applied:**
- Created `sanitize_debug_data()` function that automatically redacts:
  - API keys, tokens, secrets, passwords
  - Access tokens, refresh tokens
  - SSN, credit cards, CVV, PINs
  - Email addresses (replaced with `[EMAIL]`)
- Updated `log_message_insertion()` trigger to use sanitization
- Added RLS policy for 30-day log retention (auto-expires old logs)

**Example:**
```sql
-- Test sanitization
SELECT sanitize_debug_data('{"apiKey": "sk_live_123", "email": "user@example.com"}'::jsonb);
-- Returns: {"apiKey": "[REDACTED]", "email": "[EMAIL]"}
```

---

## ✅ Phase 2: User Actions Required

### 2.1 Enable Leaked Password Protection (REQUIRED)

**What:** Prevents users from using passwords that have been exposed in data breaches.

**How to Enable:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/auth/providers
2. Scroll to "Password Settings" section
3. Enable "Leaked Password Protection"
4. Click "Save"

**Impact:** Users will be unable to set passwords that appear in known breach databases (e.g., HaveIBeenPwned).

**Priority:** ⚠️ HIGH - Should be enabled before production deployment

---

### 2.2 Upgrade Postgres Version (RECOMMENDED)

**What:** Apply security patches available in newer Postgres versions.

**How to Upgrade:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/settings/infrastructure
2. Click "Upgrade" button for Postgres
3. Review the migration plan
4. Schedule upgrade during low-traffic period
5. Confirm upgrade

**Impact:** 
- Downtime: ~2-5 minutes
- Security patches applied
- Performance improvements

**Priority:** 🔶 MEDIUM - Schedule within 30 days

**Documentation:** https://supabase.com/docs/guides/platform/upgrading

---

## ✅ Phase 3: Webhook Security (COMPLETED)

### 3.1 Aircall Webhook Signature Verification

**Issue:** `call-events-webhook` accepted requests without verification.

**Fix Applied:**
- Implemented HMAC SHA-256 signature verification
- Checks `x-aircall-signature` header
- Rejects requests with invalid signatures (401)
- Gracefully degrades if `AIRCALL_WEBHOOK_TOKEN` not set (logs warning)

**Setup Required:**
1. Set `AIRCALL_WEBHOOK_TOKEN` secret in Supabase:
   ```bash
   # In Supabase Dashboard > Settings > Edge Functions > Secrets
   AIRCALL_WEBHOOK_TOKEN=<your-aircall-webhook-token>
   ```

2. Configure Aircall to send signatures:
   - Go to Aircall dashboard > Integrations > Webhooks
   - Enable "Sign webhooks"
   - Use the same token as above

**Test:**
```bash
# Valid request (will be accepted)
curl -X POST https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/call-events-webhook \
  -H "x-aircall-signature: <valid-hmac-sha256>" \
  -d '{"event": "call.created", "data": {...}}'

# Invalid signature (will be rejected with 401)
curl -X POST https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/call-events-webhook \
  -H "x-aircall-signature: invalid" \
  -d '{"event": "call.created", "data": {...}}'
```

---

### 3.2 SendGrid Header-Based Authentication

**Issue:** `sendgrid-inbound` used URL query parameter for authentication (visible in logs).

**Fix Applied:**
- Supports header-based authentication:
  - `Authorization: Bearer <token>` (preferred)
  - `X-SendGrid-Token: <token>` (alternative)
- Query parameter `?token=<token>` still supported but deprecated
- Logs warning when query param is used

**Migration Steps:**
1. Update SendGrid webhook configuration:
   - Go to SendGrid dashboard > Settings > Inbound Parse
   - Update webhook URL to: `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/sendgrid-inbound`
   - Remove `?token=...` from URL
   - Add custom header: `X-SendGrid-Token: <your-token>`

2. Test both methods work during transition period

3. Remove query parameter once confirmed working

**Before (Deprecated):**
```
POST /functions/v1/sendgrid-inbound?token=secret123
```

**After (Secure):**
```
POST /functions/v1/sendgrid-inbound
X-SendGrid-Token: secret123
```

---

---

## ✅ Phase 4: OAuth Configuration (COMPLETED)

### 4.1 Multi-Domain OAuth Support

**Issue:** OAuth redirects not configured for production domains, causing "Invalid redirect URL" errors.

**Fix Applied:**
- Updated `supabase/config.toml`:
  - `site_url` set to primary domain: `https://support.noddi.co`
  - `additional_redirect_urls` includes both:
    - `https://support.noddi.co`
    - `https://lovable-customer-support-hub.lovable.app`
    - Development URLs for testing

**User Actions Required:**
1. **Supabase Dashboard** - Update URL Configuration:
   🔗 https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/auth/url-configuration
   - Site URL: `https://support.noddi.co`
   - Redirect URLs: Add `https://support.noddi.co/**` and `https://lovable-customer-support-hub.lovable.app/**`

2. **Google Cloud Console** - Update OAuth Client:
   🔗 https://console.cloud.google.com/apis/credentials
   - Add both production domains to "Authorized JavaScript origins"
   - Verify callback URL: `https://qgfaycwsangsqzpveoup.supabase.co/auth/v1/callback`

**Testing:**
- Google OAuth should work on both production domains
- Development environment OAuth still functional

---

### 4.2 Sensitive Console Logging Removed

**Issue:** Authentication flows logged sensitive user data in production.

**Fix Applied:**
- Wrapped all auth-related console logs in `import.meta.env.DEV` checks
- Affected areas:
  - Google OAuth error logging (lines 122-127)
  - Sign-up process debugging (lines 168-205)

**Security Impact:**
- Prevents exposure of email addresses, auth tokens, and user data in production logs
- Debugging information still available in development mode

---

## 🔶 Remaining Warnings (Non-Critical)

### Extension in Public Schema
**Status:** Informational - Can be ignored

**Explanation:** Some Postgres extensions are installed in the `public` schema. This is managed by Supabase and does not pose a security risk for this application.

**Action:** None required

---

### Test Functions Still Public
**Status:** Development only - Remove before production

**Functions to secure/remove:**
- `test-aircall-webhook` (verify_jwt = false)
- `test-basic` (verify_jwt = false)
- `test-download-voicemail` (verify_jwt = false)

**Recommendation:**
```toml
# In supabase/config.toml - Before production deployment

# Option 1: Enable JWT verification
[functions.test-aircall-webhook]
verify_jwt = true

# Option 2: Remove test functions entirely
# Delete the function folders
```

---

## Security Checklist

### ✅ Critical Issues (Fixed)
- [x] Customer PII exposure (RLS too broad)
- [x] Client-side admin checks (using server-side roles)
- [x] XSS via unsanitized HTML (DOMPurify integration)
- [x] Public voicemail bucket (RLS policies added)
- [x] Function search path vulnerabilities (all fixed)
- [x] Debug logs sensitive data (sanitization implemented)
- [x] Webhook endpoints signature verification (Aircall HMAC)
- [x] SendGrid token in URL (moved to headers)
- [x] OAuth redirect URL misconfiguration (multi-domain support)
- [x] Console logging sensitive data (dev-only logs)

### ⚠️ User Actions Required
- [ ] Enable Leaked Password Protection (2.1)
- [ ] Schedule Postgres upgrade (2.2)
- [ ] Configure Aircall webhook signatures (3.1)
- [ ] Migrate SendGrid to header auth (3.2)

### 🔶 Before Production
- [ ] Remove or secure test edge functions
- [ ] Review all RLS policies
- [ ] Audit secret rotation schedule
- [ ] Enable rate limiting on webhooks

---

## Support & Documentation

- **Supabase Security**: https://supabase.com/docs/guides/database/database-linter
- **Lovable Security**: https://docs.lovable.dev/features/security
- **Webhook Signatures**: See Phase 3 sections above

---

## Change Log

| Date | Phase | Changes |
|------|-------|---------|
| 2025-10-14 | Phase 1 | Fixed function search paths, added debug log sanitization |
| 2025-10-14 | Phase 3 | Implemented Aircall signature verification, SendGrid header auth |
| 2025-10-14 | Phase 4 | Configured multi-domain OAuth, removed sensitive console logging |

---

**Next Steps:**
1. Complete Phase 2.1 (Enable Leaked Password Protection) - 5 minutes
2. Schedule Phase 2.2 (Postgres upgrade) - Plan for maintenance window
3. Configure webhook signatures (Phase 3) - 15 minutes
4. Test all webhook endpoints - 30 minutes
