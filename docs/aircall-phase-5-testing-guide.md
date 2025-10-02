# Phase 5: Aircall Everywhere Testing Guide

## Pre-Testing Setup

### Required Access
- [ ] Admin access to the application
- [ ] Access to Aircall admin dashboard
- [ ] Valid Aircall Everywhere API credentials
- [ ] Test browsers installed: Chrome, Edge, Safari, Firefox, Brave

### Configuration
1. Navigate to Admin Portal → Integrations → Aircall Settings
2. Ensure webhook token is configured
3. Configure Aircall Everywhere credentials (or prepare test credentials)

## Test Execution Plan

### 🧪 Test Suite 1: Credential Testing (Admin UI)

#### Test 1.1: Valid Credentials
**Steps:**
1. Navigate to Admin → Aircall Settings
2. Enable "Aircall Everywhere"
3. Enter valid API ID and API Token
4. Click "Test Credentials"

**Expected Results:**
- ✅ Button shows "Testing..." with loading state
- ✅ Green alert appears with "✓ Connected to [Company Name]"
- ✅ Timestamp shows current time
- ✅ Toast notification: "Credentials valid"

**Validation:**
- Check edge function logs for successful API call
- Verify company name matches Aircall dashboard

#### Test 1.2: Invalid API ID
**Steps:**
1. Enter invalid API ID (e.g., "invalid123")
2. Enter valid API Token
3. Click "Test Credentials"

**Expected Results:**
- ❌ Red alert appears with "✗ Invalid credentials: Invalid credentials"
- ❌ Toast notification: "Credentials invalid"
- ❌ Status code should be 401

#### Test 1.3: Invalid API Token
**Steps:**
1. Enter valid API ID
2. Enter invalid API Token (e.g., "wrongtoken")
3. Click "Test Credentials"

**Expected Results:**
- ❌ Red alert appears with "✗ Invalid credentials: Invalid credentials"
- ❌ Toast notification: "Credentials invalid"

#### Test 1.4: Missing Credentials
**Steps:**
1. Leave API ID or Token empty
2. Observe button state

**Expected Results:**
- ⚠️ Button is disabled (grayed out)

#### Test 1.5: Network Error
**Steps:**
1. Block outbound requests to supabase.co (via browser dev tools or firewall)
2. Click "Test Credentials"

**Expected Results:**
- ❌ Red alert with network error message
- ❌ Toast notification: "Test failed"

---

### 🍪 Test Suite 2: Cookie Detection

#### Test 2.1: Chrome - Cookies Enabled
**Setup:**
1. Open Chrome
2. Settings → Privacy → Cookies → "Allow all cookies"
3. Restart Chrome
4. Navigate to app

**Expected Results:**
- ✅ Cookie detection passes (feature test)
- ✅ Browser detection: Chrome (fully supported)
- ✅ Proceeds to SDK initialization
- ✅ Login modal appears (not blocked modal)

**Console Logs:**
```
[AircallProvider] 🍪 Checking third-party cookie support...
[AircallProvider] Cookie detection result: { supported: true, method: 'feature_test', browserType: 'chrome' }
[AircallProvider] ✅ Third-party cookies supported
```

#### Test 2.2: Chrome - Cookies Disabled
**Setup:**
1. Open Chrome
2. Settings → Privacy → Cookies → "Block third-party cookies"
3. Restart Chrome
4. Navigate to app

**Expected Results:**
- ❌ Cookie detection fails (feature test)
- ⚠️ Orange alert modal appears: "Third-Party Cookies Blocked"
- ⚠️ Shows Chrome-specific instructions (4 steps)
- ⚠️ Toast: "Third-Party Cookies Blocked"
- ⚠️ SDK initialization ABORTED (never runs)

**Console Logs:**
```
[AircallProvider] 🍪 Checking third-party cookie support...
[AircallProvider] Cookie detection result: { supported: false, method: 'feature_test', browserType: 'chrome' }
[AircallProvider] ❌ THIRD-PARTY COOKIES BLOCKED - STOPPING INITIALIZATION
```

#### Test 2.3: Safari (any version)
**Setup:**
1. Open Safari
2. Navigate to app

**Expected Results:**
- ❌ Cookie detection fails immediately (browser policy)
- ⚠️ Orange alert modal appears: "Third-Party Cookies Blocked"
- ⚠️ Shows Safari instructions: "Safari blocks third-party cookies by default. This cannot be changed. Please use Chrome."
- ⚠️ SDK initialization ABORTED

**Console Logs:**
```
[AircallProvider] 🍪 Checking third-party cookie support...
[AircallProvider] Cookie detection result: { supported: false, method: 'browser_policy', browserType: 'safari', details: 'Safari blocks third-party cookies by default' }
[AircallProvider] ❌ THIRD-PARTY COOKIES BLOCKED - STOPPING INITIALIZATION
```

#### Test 2.4: Firefox - Enhanced Tracking Protection
**Setup:**
1. Open Firefox
2. Privacy & Security → Enhanced Tracking Protection → "Strict"
3. Navigate to app

**Expected Results:**
- ❌ Cookie detection fails (browser policy)
- ⚠️ Modal shows Firefox-specific instructions
- ⚠️ Recommends switching to "Standard" protection

#### Test 2.5: Brave - Shields Up
**Setup:**
1. Open Brave
2. Ensure Brave Shields are UP for the site
3. Navigate to app

**Expected Results:**
- ❌ Cookie detection fails (browser policy)
- ⚠️ Modal shows Brave-specific instructions
- ⚠️ Instructions include: "Click Brave Shields icon → Toggle OFF"

#### Test 2.6: Edge - Cookies Disabled
**Setup:**
1. Open Edge
2. Settings → Cookies → "Block third-party cookies"
3. Restart Edge
4. Navigate to app

**Expected Results:**
- ❌ Cookie detection fails (feature test)
- ⚠️ Modal shows Edge-specific instructions

---

### 🔐 Test Suite 3: Authentication Flows

#### Test 3.1: Valid Credentials + Cookies Enabled + Login Success
**Setup:**
1. Chrome with cookies enabled
2. Valid Aircall credentials configured
3. Navigate to app

**Expected Results:**
1. ✅ Cookie detection passes
2. ✅ Browser detection passes
3. ✅ SDK initializes
4. ✅ Login modal appears (blue loading spinner)
5. User logs in via Aircall workspace
6. ✅ Login modal closes automatically
7. ✅ Phone bar appears at bottom
8. ✅ Toast: "✅ Logged In Successfully"

#### Test 3.2: Valid Credentials + Cookies Enabled + No Login (15s)
**Setup:**
1. Same as 3.1
2. DON'T log in to Aircall workspace
3. Wait 15+ seconds

**Expected Results:**
1. ✅ Login modal stays open
2. ⚠️ After 15s, troubleshooting section appears (amber background)
3. ✅ Shows 3 checks: Cookies, Credentials, New Tab
4. ✅ Cookie instructions are collapsible
5. ✅ "Open Aircall in New Tab" button works
6. ✅ "Skip Phone Integration" button visible

#### Test 3.3: Invalid Credentials + Cookies Enabled
**Setup:**
1. Configure invalid Aircall credentials in admin
2. Enable Aircall Everywhere
3. Save and refresh

**Expected Results:**
1. ✅ Cookie detection passes
2. ✅ Browser detection passes
3. ❌ SDK initialization fails with 401
4. ❌ Red alert modal appears: "Authentication Failed (401)"
5. ⚠️ Lists 4 possible causes
6. ⚠️ Toast: "Authentication Failed"
7. ⚠️ Skip button visible

**Validation:**
- Check if error listener caught 401 OR catch block detected it
- Verify `diagnosticIssues` includes `'authentication_failed'`

---

### 🌐 Test Suite 4: Network & Firewall

#### Test 4.1: Ad Blocker Active
**Setup:**
1. Install uBlock Origin or AdBlock Plus
2. Enable extension
3. Navigate to app

**Expected Results:**
- Depends on extension configuration
- If blocking phone.aircall.io:
  - ❌ Environment diagnostics detect block
  - ⚠️ Modal shows "Network Blocked"
  - ⚠️ Instructions to disable ad blocker

#### Test 4.2: Firewall Blocking
**Setup:**
1. Block phone.aircall.io via hosts file:
   ```
   127.0.0.1 phone.aircall.io
   ```
2. Navigate to app

**Expected Results:**
- ❌ Environment diagnostics fail
- ⚠️ Modal shows "Network Blocked"
- ⚠️ Mentions phone.aircall.io and api.aircall.io

---

### 📱 Test Suite 5: Modal Interactions

#### Test 5.1: Blocked Modal - Retry Button
**Setup:**
1. Trigger any blocking condition
2. Fix the issue (enable cookies, disable blocker)
3. Click "Retry Connection"

**Expected Results:**
- ✅ Re-runs initialization from scratch
- ✅ If fixed, proceeds to login modal
- ❌ If still broken, shows blocked modal again

#### Test 5.2: Blocked Modal - Skip Button
**Setup:**
1. Trigger any blocking condition
2. Click "Skip & Continue Without Phone"

**Expected Results:**
- ✅ Modal closes
- ✅ App continues to work normally
- ✅ No phone bar appears
- ✅ sessionStorage has 'aircall_opted_out' = 'true'
- ✅ Refresh doesn't trigger initialization again

#### Test 5.3: Login Modal - Skip Button
**Setup:**
1. Successful initialization, login modal open
2. Click "Skip Phone Integration"

**Expected Results:**
- ✅ Modal closes
- ✅ App continues to work
- ✅ Can opt back in later if needed

#### Test 5.4: Login Modal - Manual Confirm
**Setup:**
1. Login modal open
2. Log in to Aircall in new tab
3. Return to app
4. Click "I'm Logged In"

**Expected Results:**
- ✅ Verifies login status via SDK
- ✅ If logged in: Modal closes, phone bar appears
- ❌ If not logged in: Shows error state, can retry

---

### 🔄 Test Suite 6: Edge Cases

#### Test 6.1: Multiple Tabs
**Steps:**
1. Open app in Tab 1
2. Log in to Aircall
3. Open app in Tab 2

**Expected Results:**
- ✅ Tab 2 detects existing login (localStorage)
- ✅ Both tabs work independently
- ✅ No initialization race conditions

#### Test 6.2: Browser Restart
**Steps:**
1. Log in to Aircall
2. Close browser completely
3. Reopen browser and navigate to app

**Expected Results:**
- ✅ Cookie detection passes
- ✅ SDK initializes
- ⚠️ May need to re-login (Aircall session expired)
- ✅ Login modal appears if not logged in

#### Test 6.3: Network Recovery
**Steps:**
1. Log in successfully
2. Disconnect network
3. Reconnect network after 30s

**Expected Results:**
- ⚠️ Connection lost detected
- ✅ Automatic reconnection attempts (exponential backoff)
- ✅ Toast: "Connection Lost" then "Reconnected"
- ✅ Phone functionality restored

#### Test 6.4: Credential Change Mid-Session
**Steps:**
1. Log in successfully
2. Admin changes API credentials
3. User still active

**Expected Results:**
- ✅ Current session continues to work
- ⚠️ Next refresh will use new credentials
- ⚠️ If new credentials invalid, proper error shown

---

## Automated Test Execution

### Quick Validation Script

```bash
# Test 1: Check files exist
test -f src/lib/cookie-detection.ts && echo "✅ Cookie detection exists"
test -f supabase/functions/test-aircall-credentials/index.ts && echo "✅ Edge function exists"

# Test 2: Check imports
grep -q "detectThirdPartyCookies" src/contexts/AircallContext.tsx && echo "✅ Context imports cookie detection"
grep -q "getCookieEnableInstructions" src/components/dashboard/voice/AircallBlockedModal.tsx && echo "✅ Modal imports cookie instructions"

# Test 3: Check config
grep -q "test-aircall-credentials" supabase/config.toml && echo "✅ Edge function registered"

# Test 4: Check i18n
grep -q "testCredentials" src/locales/en/common.json && echo "✅ i18n keys present"
```

### TypeScript Validation
```bash
# Run type check
npm run type-check

# Expected: 0 errors related to cookie-detection or browser-detection
```

### Build Validation
```bash
# Build project
npm run build

# Expected: Successful build, edge functions deployed
```

## Manual Testing Priority

### High Priority (Must Test)
1. ✅ Test 1.1 - Valid credentials
2. ✅ Test 2.2 - Chrome cookies disabled
3. ✅ Test 2.3 - Safari (always blocks)
4. ✅ Test 3.1 - Happy path end-to-end
5. ✅ Test 3.3 - Invalid credentials
6. ✅ Test 5.2 - Skip button functionality

### Medium Priority (Should Test)
7. Test 1.2/1.3 - Invalid credential variations
8. Test 2.4/2.5 - Firefox and Brave
9. Test 3.2 - Long login with troubleshooting
10. Test 5.1 - Retry button
11. Test 6.2 - Browser restart

### Low Priority (Nice to Test)
12. Test 2.1 - Edge cookies
13. Test 4.1 - Ad blocker
14. Test 6.1 - Multiple tabs
15. Test 6.3 - Network recovery

## Acceptance Criteria

### Phase 5 Complete When:

#### Functional Requirements
- [ ] Cookie detection prevents unnecessary SDK initialization
- [ ] Browser detection blocks unsupported browsers early
- [ ] Credential testing validates before enabling integration
- [ ] Modals display correct content for each failure type
- [ ] Skip button works in all scenarios
- [ ] No console errors in happy path

#### User Experience Requirements
- [ ] Error messages are clear and actionable
- [ ] Instructions are browser-specific
- [ ] Users can recover from any failure state
- [ ] No dead-ends or confusing states
- [ ] Performance is acceptable (<2s to show first modal)

#### Security Requirements
- [ ] API tokens never exposed in client-side code
- [ ] Edge function requires authentication
- [ ] CORS properly configured
- [ ] No credential data logged in browser console

#### Documentation Requirements
- [ ] All setup steps documented
- [ ] All error states documented
- [ ] Browser requirements clearly stated
- [ ] Firewall requirements listed

## Test Execution Log

### Test Session 1: [Date]
**Tester**: [Name]  
**Environment**: [Browser + Version]

| Test ID | Status | Notes |
|---------|--------|-------|
| 1.1 | ⬜ | |
| 1.2 | ⬜ | |
| 2.2 | ⬜ | |
| 2.3 | ⬜ | |
| 3.1 | ⬜ | |
| 3.3 | ⬜ | |
| 5.2 | ⬜ | |

### Issues Found

| Issue ID | Description | Severity | Status |
|----------|-------------|----------|--------|
| - | - | - | - |

## Post-Testing Actions

### If All Tests Pass
1. Mark Phase 5 as complete ✅
2. Update README with browser requirements
3. Communicate to team about new validation features
4. Monitor edge function logs for first 24 hours
5. Collect user feedback on error messaging

### If Issues Found
1. Document issue with test ID reference
2. Prioritize by severity (Critical > High > Medium > Low)
3. Fix critical issues before proceeding
4. Retest after fixes
5. Update this checklist with any new scenarios discovered

## Monitoring Post-Deployment

### Metrics to Track (First Week)

```sql
-- Edge function success rate
SELECT 
  COUNT(*) FILTER (WHERE status = 200) as successful_tests,
  COUNT(*) FILTER (WHERE status = 401) as auth_failures,
  COUNT(*) FILTER (WHERE status >= 500) as server_errors,
  COUNT(*) as total_tests
FROM edge_function_logs 
WHERE function_name = 'test-aircall-credentials'
  AND timestamp > NOW() - INTERVAL '7 days';
```

### User Behavior to Monitor
- Skip button click rate (high rate = UX issue)
- Credential test usage rate (low rate = feature not discovered)
- Time spent in login modal (long time = confusion)
- Retry button usage (high usage = unclear instructions)

## Success Declaration

Phase 5 is considered **COMPLETE** when:
- ✅ All High Priority tests pass
- ✅ No critical bugs found
- ✅ Documentation is accurate
- ✅ Team is trained on new features
- ✅ Monitoring is in place

## Rollback Procedure

If critical issues arise post-deployment:

1. **Immediate**: Disable Aircall Everywhere in Admin Settings
   ```sql
   UPDATE voice_integrations 
   SET configuration = jsonb_set(
     configuration, 
     '{aircallEverywhere,enabled}', 
     'false'
   )
   WHERE provider = 'aircall';
   ```

2. **Communication**: Notify users that phone integration is temporarily disabled

3. **Investigation**: Review edge function logs and browser console logs

4. **Fix**: Address root cause based on error patterns

5. **Re-enable**: Gradually re-enable for test users first

## Conclusion

This testing guide ensures comprehensive validation of all Aircall Everywhere enhancements. Follow the priority order, document all findings, and ensure acceptance criteria are met before declaring Phase 5 complete.

**Next Steps**: Execute Test Suite 1 (Credential Testing) first as it's isolated from the main flow.
