# Aircall Everywhere - Testing Checklist

## Overview

This document provides a comprehensive testing matrix for validating the Aircall Everywhere integration across different browsers, cookie settings, and credential scenarios.

## Phase 1-4 Implementation Validation

### ✅ Phase 1: Foundation
- [x] `src/lib/cookie-detection.ts` - Three-layer cookie detection
- [x] `supabase/functions/test-aircall-credentials/index.ts` - Secure credential testing
- [x] `src/locales/en/common.json` - i18n keys for credential testing
- [x] `docs/aircall-everywhere-integration.md` - Updated with requirements
- [x] `supabase/config.toml` - Edge function registered

### ✅ Phase 2: Admin UI
- [x] `src/components/admin/AircallSettings.tsx` - Test Credentials button
- [x] Credential test result display with company name
- [x] Error handling for invalid credentials
- [x] Timestamp for last test

### ✅ Phase 3: Modal Enhancements
- [x] `AircallBlockedModal.tsx` - Cookie-specific sections
- [x] `AircallBlockedModal.tsx` - Authentication failure section
- [x] `AircallBlockedModal.tsx` - Network/iframe sections
- [x] `AircallLoginModal.tsx` - Troubleshooting after 15s
- [x] `AircallLoginModal.tsx` - Cookie instructions in hints
- [x] All modals have "Skip Phone Integration" button

### ✅ Phase 4: Context Integration
- [x] `src/contexts/AircallContext.tsx` - Cookie detection BEFORE SDK init
- [x] Browser compatibility check before cookie check
- [x] 401 error detection in error listener
- [x] Authentication failure detection in catch block
- [x] Appropriate modal shown based on failure type

## Phase 5: Testing Matrix

### Browser Testing

| Browser | Version | Cookies Enabled | Expected Result |
|---------|---------|----------------|-----------------|
| Chrome | Latest | ✅ Yes | ✅ Initialize successfully |
| Chrome | Latest | ❌ No | ⚠️ Show cookie blocked modal |
| Edge | Latest | ✅ Yes | ✅ Initialize successfully |
| Edge | Latest | ❌ No | ⚠️ Show cookie blocked modal |
| Brave | Latest | ✅ Yes, Shields Down | ✅ Initialize successfully |
| Brave | Latest | ✅ Yes, Shields Up | ⚠️ Show cookie blocked modal |
| Brave | Latest | ❌ No | ⚠️ Show cookie blocked modal |
| Safari | Latest | N/A | ❌ Show unsupported browser modal |
| Firefox | Latest | ✅ Standard Protection | ⚠️ Show unsupported browser modal |
| Firefox | Latest | ❌ Strict Protection | ❌ Show unsupported browser modal |

### Cookie Detection Testing

| Scenario | Detection Method | Expected Behavior |
|----------|-----------------|-------------------|
| Safari (any version) | Browser Policy | Immediate block, show cookie modal |
| Firefox (ETP enabled) | Browser Policy | Immediate block, show cookie modal |
| Brave (default) | Browser Policy | Immediate block, show cookie modal |
| Chrome (cookies disabled) | Feature Test | Detect block, show cookie modal |
| Edge (cookies disabled) | Feature Test | Detect block, show cookie modal |
| Chrome (cookies enabled) | Feature Test | Pass, continue to SDK init |

### Credential Testing

| Scenario | Admin UI | Expected Result |
|----------|----------|-----------------|
| Valid API ID + Token | Click "Test Credentials" | ✅ Show company name, green alert |
| Invalid API ID | Click "Test Credentials" | ❌ Show "Invalid credentials", red alert |
| Invalid Token | Click "Test Credentials" | ❌ Show "Invalid credentials", red alert |
| Missing API ID | Click "Test Credentials" | ⚠️ Button disabled |
| Missing Token | Click "Test Credentials" | ⚠️ Button disabled |
| Network error during test | Click "Test Credentials" | ❌ Show error message |

### Authentication Flow Testing

| Scenario | Expected Modal | Expected Diagnostic Issues |
|----------|---------------|---------------------------|
| Cookies blocked (Safari) | AircallBlockedModal | `['cookies_blocked', 'safari']` |
| Cookies blocked (Chrome) | AircallBlockedModal | `['cookies_blocked', 'chrome']` |
| Invalid credentials | AircallBlockedModal | `['authentication_failed']` |
| Network/firewall block | AircallBlockedModal | `['network_blocked']` |
| Ad blocker blocking | AircallBlockedModal | `['resources_blocked']` |
| Successful init, not logged in | AircallLoginModal | `[]` |
| Logged in after 15s | AircallLoginModal (auto-close) | `[]` |

### Modal Content Validation

#### AircallBlockedModal
- [x] Priority order: Cookies > Auth > Network > Iframe > Timeout
- [x] Cookie section shows browser-specific instructions
- [x] Auth section shows 4 possible causes (credentials, cookies, session, network)
- [x] Network section mentions phone.aircall.io and api.aircall.io
- [x] "Skip & Continue Without Phone" button always visible
- [x] Technical details collapsible section

#### AircallLoginModal
- [x] Shows unsupported browser warning immediately
- [x] Shows Brave warning after 5 seconds
- [x] Shows troubleshooting section after 15 seconds
- [x] Troubleshooting includes 3 checks: Cookies, Credentials, Login in New Tab
- [x] Cookie instructions are collapsible
- [x] "Skip Phone Integration" button always visible

### Edge Function Testing

#### test-aircall-credentials
- [x] CORS headers present
- [x] OPTIONS request handler
- [x] Validates apiId and apiToken are present
- [x] Makes Basic Auth request to api.aircall.io/v1/company
- [x] Returns company data on success
- [x] Returns 401 status on auth failure
- [x] Logs all requests and responses
- [x] Registered in config.toml with verify_jwt = true

### Context Logic Validation

#### Pre-initialization Checks (in order)
1. [x] Check if user opted out (sessionStorage)
2. [x] Check if config is enabled
3. [x] Check if credentials are present
4. [x] **Detect third-party cookies** ← NEW
5. [x] Detect browser compatibility
6. [x] Setup error listener for network/401
7. [x] Run environment diagnostics
8. [x] Initialize SDK

#### Error Handling
- [x] Cookies blocked → Set diagnostic issues, show blocked modal, abort
- [x] Unsupported browser → Set diagnostic issues, show blocked modal, abort
- [x] Network blocked (error event) → Set diagnostic issues, show blocked modal, abort
- [x] 401 in error event → Set diagnostic issues, show blocked modal, abort
- [x] 401 in catch block → Detect from error message, show blocked modal
- [x] Network error in catch → Detect from error message, show blocked modal
- [x] Generic error → Show generic failed message

## Integration Points Validation

### Admin Settings → Context
- [x] Credentials saved in `voice_integrations` table
- [x] Context reads from `getIntegrationByProvider('aircall')`
- [x] Test button calls edge function, not SDK
- [x] Browser requirements alert displayed

### Context → Modals
- [x] `diagnosticIssues` passed to `AircallBlockedModal`
- [x] Modal categorizes issues correctly
- [x] Cookie instructions use browser type from issues array
- [x] Skip button works in all states

### Modals → User
- [x] Clear instructions for each failure type
- [x] Browser-specific instructions
- [x] Visual hierarchy (alerts with icons)
- [x] Escape hatch always available

## Manual Test Scenarios

### Scenario 1: Happy Path (Chrome, cookies enabled, valid credentials)
1. Open app in Chrome
2. Ensure third-party cookies enabled
3. Navigate to Admin → Aircall Settings
4. Enter valid API ID and Token
5. Click "Test Credentials"
   - **Expected**: ✅ Green alert with company name
6. Enable "Aircall Everywhere"
7. Save configuration
8. Refresh page
9. **Expected**: Cookie detection passes → Browser check passes → SDK initializes → Login modal appears
10. Log in to Aircall in workspace
11. **Expected**: Login modal closes, phone bar appears

### Scenario 2: Cookies Blocked (Chrome, cookies disabled)
1. Open Chrome Settings → Privacy → Block third-party cookies
2. Refresh app
3. **Expected**: 
   - Cookie detection fails immediately
   - Orange alert modal shows "Third-Party Cookies Blocked"
   - Instructions for Chrome displayed with numbered steps
   - "Skip & Continue" button visible

### Scenario 3: Invalid Credentials
1. Open app with cookies enabled
2. Go to Admin → Aircall Settings
3. Enter invalid API ID or Token
4. Click "Test Credentials"
   - **Expected**: ❌ Red alert "Invalid credentials"
5. Enable Aircall Everywhere with invalid creds
6. Save configuration
7. Refresh page
8. **Expected**:
   - Cookie/browser checks pass
   - SDK initialization fails with 401
   - Red alert modal shows "Authentication Failed"
   - Lists 4 possible causes

### Scenario 4: Safari (Always blocks cookies)
1. Open app in Safari
2. **Expected**:
   - Browser policy detection immediately fails
   - Modal shows "Safari blocks third-party cookies by default"
   - Instructions say "This cannot be changed"
   - Recommends Chrome

### Scenario 5: Brave (Shields enabled)
1. Open app in Brave with Shields Up
2. **Expected**:
   - Cookie detection fails (Brave policy)
   - Modal shows Brave-specific instructions
   - Instructions include "Toggle Shields OFF for this site"

### Scenario 6: Long Login (15+ seconds)
1. Initialize successfully
2. Don't log in to Aircall workspace
3. Wait 15 seconds
4. **Expected**:
   - Login modal shows troubleshooting section
   - 3 checks displayed: Cookies, Credentials, Login in New Tab
   - Cookie instructions collapsible by browser
   - "Open Aircall in New Tab" button works

### Scenario 7: Network/Firewall Block
1. Block phone.aircall.io in firewall/hosts file
2. Refresh app
3. **Expected**:
   - Cookie/browser checks pass
   - Environment diagnostics detect block
   - Modal shows "Network Blocked"
   - Mentions phone.aircall.io and api.aircall.io

## Regression Testing

### Ensure No Breaking Changes
- [ ] Voice interface still works for users who were already authenticated
- [ ] Existing call events still trigger properly
- [ ] Call controls (answer, reject, hang up) still function
- [ ] Customer context still pre-loads on calls
- [ ] Post-call actions still appear after calls
- [ ] Keyboard shortcuts still work
- [ ] Skip button doesn't break app state

### Performance Checks
- [ ] Cookie detection completes in <100ms
- [ ] Browser detection completes in <50ms
- [ ] Credential test completes in <2s
- [ ] No memory leaks from error listeners
- [ ] AbortController properly cancels initialization

## Edge Cases

### Multiple Tabs
- [ ] Opening app in multiple tabs doesn't cause race conditions
- [ ] Login in one tab reflects in others (via localStorage)
- [ ] Skip in one tab doesn't affect others negatively

### Network Flakiness
- [ ] Intermittent network during init shows appropriate error
- [ ] Recovery after network restored works
- [ ] Reconnection logic still functions

### Mixed States
- [ ] Cookies enabled but credentials invalid → Auth failure modal
- [ ] Cookies blocked but credentials valid → Cookie blocked modal
- [ ] Supported browser but cookies blocked → Cookie modal (not browser modal)

## Documentation Validation

### docs/aircall-everywhere-integration.md
- [x] Browser requirements section complete
- [x] Third-party cookies requirement explained
- [x] Instructions for each browser
- [x] Network/firewall requirements listed
- [x] 401 troubleshooting expanded (4 causes)
- [x] Cookie detection troubleshooting added

### i18n Keys
- [x] `settings.aircall.testCredentials`
- [x] `settings.aircall.testingCredentials`
- [x] `settings.aircall.credentialsValid`
- [x] `settings.aircall.credentialsInvalid`
- [x] `settings.aircall.credentialsError`
- [x] `settings.aircall.lastTested`

## Success Criteria

### Phase 1-4 Complete When:
- ✅ Cookie detection runs before SDK initialization
- ✅ Browser detection identifies unsupported browsers
- ✅ Credential testing works in Admin UI
- ✅ Modals show appropriate content for each failure type
- ✅ Error handling distinguishes cookies, auth, network, browser
- ✅ Skip button always works
- ✅ Documentation is comprehensive

### Phase 5 Complete When:
- [ ] All test scenarios pass
- [ ] No regressions in existing functionality
- [ ] Edge cases handled gracefully
- [ ] Performance metrics acceptable
- [ ] User can recover from any failure state

## Known Limitations

1. **iOS Safari Cookie Detection**: Cannot be bypassed, will always show unsupported
2. **Corporate Proxies**: May block phone.aircall.io even with correct settings
3. **Browser Extensions**: Some privacy extensions may interfere unpredictably
4. **Feature Detection Accuracy**: Same-domain cookie test is a proxy, not 100% accurate for third-party

## Next Steps After Validation

If all tests pass:
1. Deploy to production
2. Monitor edge function logs for credential test patterns
3. Collect user feedback on modal clarity
4. Track skip rate vs. successful authentication rate

If issues found:
1. Document specific failure scenarios
2. Add additional logging
3. Refine error messages
4. Consider additional fallback strategies
