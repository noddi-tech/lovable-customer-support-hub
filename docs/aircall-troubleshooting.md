# Aircall Integration Troubleshooting Guide

## Prerequisites

Before troubleshooting Aircall integration issues, ensure you have:

- **React Query 5.90.2+** - Version mismatch can cause initialization failures
- **Chrome browser** - Recommended for best compatibility
- **Third-party cookies enabled** - Required for Aircall SDK
- **No ad blockers** - Can interfere with aircall.io domains
- **Valid API credentials** - API ID and API Token from Aircall dashboard

## Common Issues

### 1. Infinite Recursion / Stack Overflow (CRITICAL)

**Symptoms:**
- Browser freezes or becomes unresponsive
- Console shows "Maximum call stack size exceeded"
- Hundreds of identical log messages flooding the console
- Page crashes or automatically reloads
- Debug panel shows recursion guards stuck at 🔒

**Cause:**
The Aircall SDK dispatches events when `showWorkspace()` or `hideWorkspace()` are called. If these events trigger the same functions again, an infinite loop occurs.

**Solution:**
The integration now uses recursion guard flags (`isShowingWorkspaceRef`, `isHidingWorkspaceRef`) to prevent this:

1. **Check Debug Panel:**
   - Enable debug panel with `?debug=aircall`
   - Look at "Recursion Guards" section
   - "Showing (locked)" and "Hiding (locked)" should show ✅
   - If showing 🔒 for more than 100ms, there's a guard issue

2. **Immediate Fix:**
   - Reload the page to clear recursion state
   - Guards will reset automatically

3. **If Problem Persists:**
   - Verify no other code is calling `aircallPhone.showWorkspace()` directly
   - Check event listeners for duplicate registrations
   - Look for custom code that may bypass the context functions

### 2. Workspace Not Loading (401 Errors)

**Symptoms:**
- Console shows "Workspace has not been identified yet"
- Hundreds of 401 Unauthorized errors to workspace.aircall.io
- "Show Aircall" button does nothing

**Solutions:**

1. **Check API Credentials in Database:**
   ```sql
   SELECT 
     configuration->'aircallEverywhere'->>'apiId' as api_id,
     configuration->'aircallEverywhere'->>'apiToken' as api_token,
     configuration->'aircallEverywhere'->>'domain' as domain
   FROM voice_integrations 
   WHERE provider = 'aircall' AND is_active = true;
   ```

2. **Leave Domain Field Blank:**
   - In your integration settings, ensure the `domain` field is `NULL`
   - Aircall SDK will automatically infer the current origin
   - Hard-coding preview domains can cause authentication failures

3. **Verify Third-Party Cookies:**
   - Open Chrome Settings → Privacy → Cookies
   - Ensure "Block third-party cookies" is **OFF**
   - Or add `[*.]aircall.io` to allowed sites

4. **Test in Incognito Mode:**
   - Open a new incognito/private window
   - This helps identify if browser extensions or cache are causing issues

5. **Check Browser Console:**
   - Look for ERR_BLOCKED_BY_CLIENT errors
   - Check if any browser extensions are blocking Aircall requests

### 2. React Query Version Mismatch

**Symptoms:**
- Error: `_a.isStatic is not a function`
- Aircall initialization crashes
- Blank screen or app crash

**Solution:**

Ensure both React Query packages are at the same version:
```bash
npm install @tanstack/react-query@^5.90.2 @tanstack/react-query-devtools@^5.90.2
```

### 3. SDK Not Initializing

**Symptoms:**
- Phone bar shows "Connecting..." indefinitely
- Login modal never appears
- Debug panel shows `isInitialized: false`

**Solutions:**

1. **Check Initialization Phase:**
   - Open debug panel (add `?debug=aircall` to URL in development)
   - Look for `initializationPhase` - should progress through:
     - `idle` → `diagnostics` → `creating-workspace` → `workspace-ready`
   - If stuck at `creating-workspace`, workspace iframe is likely blocked

2. **Check DOM Container:**
   - Open browser DevTools → Elements
   - Look for `#aircall-workspace-container`
   - Should contain an `<iframe>` element pointing to phone.aircall.io

3. **Force Reinitialization:**
   - Click "Reload Aircall" in the error modal
   - Or refresh the page

### 4. Calls Not Showing / Answering

**Symptoms:**
- Incoming call notifications appear
- "Answer" button does nothing or shows error
- Phone bar doesn't show call status

**Solutions:**

1. **Check Workspace Readiness:**
   - Debug panel should show `isWorkspaceReady: ✅`
   - If not ready, wait for initialization to complete

2. **Verify Login Status:**
   - Debug panel should show `isConnected: ✅`
   - If not connected, click "Show Aircall" and log in through the Aircall widget

3. **Check Network Status:**
   - Debug panel shows connection status
   - Ensure websocket connection is not blocked

### 5. Reconnection Issues

**Symptoms:**
- Frequent disconnects
- "Reconnecting..." message loops
- Multiple simultaneous reconnection attempts

**Solutions:**

The system uses exponential backoff (1s, 2s, 4s, 8s, up to 30s) with a reconnection mutex to prevent duplicate attempts. If you're experiencing loops:

1. **Clear Login Status:**
   - Open DevTools → Application → Local Storage
   - Find `aircall_login_status` and delete it
   - Refresh the page

2. **Check Network Stability:**
   - Test your internet connection
   - Check if firewall/VPN is interfering

3. **Manual Reset:**
   - Click "Try Again" in the error boundary
   - Or reload the page

## Readiness Checks

The Aircall integration has three key readiness states:

| State | Meaning | Required For |
|-------|---------|--------------|
| `isInitialized` | SDK is created and workspace exists | Showing workspace |
| `isConnected` | User is logged into Aircall | Making/receiving calls |
| `isWorkspaceReady` | Workspace iframe is mounted and ready | All phone operations |

**All three must be true** before you can make or receive calls.

## Debug Mode

### Enable Debug Panel

Add `?debug=aircall` to your URL in any environment, or it's automatically enabled in development mode.

### Debug Panel Features

- **Real-time status indicators** - Visual badges for initialization, connection, and readiness
- **Phase tracking** - Shows current initialization phase
- **Recursion guard monitoring** - Shows 🔒 when functions are locked, ✅ when ready (should never stay locked >100ms)
- **Current call info** - Displays active call ID if present
- **DOM diagnostics** - Shows container, iframe, and pointer-events status
- **Copy debug info** - Button to copy full diagnostic data to clipboard
- **Force fix** - Button to reset pointer-events to auto (useful for stuck states)

**Recursion Guard Indicators:**
- **Showing (locked) = 🔒**: Currently executing `showWorkspace()`, will ignore new calls to prevent infinite loops
- **Hiding (locked) = 🔒**: Currently executing `hideWorkspace()`, will ignore new calls to prevent infinite loops
- Both should return to ✅ within ~100ms; if stuck at 🔒, there's a deadlock - reload the page

### Example Debug Info

```json
{
  "timestamp": "2025-10-06T20:30:00.000Z",
  "initializationPhase": "logged-in",
  "isInitialized": true,
  "isConnected": true,
  "isWorkspaceReady": true,
  "workspaceVisible": true,
  "hasWorkspace": true,
  "diagnosticIssues": [],
  "workspaceContainer": {
    "exists": true,
    "classes": "aircall-visible",
    "hasIframe": true,
    "pointerEvents": "auto"
  }
}
```

## Browser Compatibility

### Recommended
- **Chrome 90+** - Best compatibility
- **Edge 90+** - Good compatibility
- **Firefox 88+** - Good compatibility

### Not Recommended
- Safari (WebRTC limitations)
- Internet Explorer (not supported)
- Mobile browsers (limited support)

## Error Boundary

If the Aircall integration crashes, an error boundary will catch it and display:

- Error message and stack trace (in development)
- "Try Again" button - Resets the Aircall component without page reload
- "Reload Page" button - Full page refresh

The error boundary prevents the entire app from crashing when Aircall has issues.

## Getting Help

If issues persist after trying these troubleshooting steps:

1. **Copy debug info** - Use the debug panel's "Copy" button
2. **Check browser console** - Look for relevant error messages
3. **Take screenshots** - Capture the error state and debug panel
4. **Contact support** - Provide debug info, console logs, and screenshots
5. **Check Aircall status** - Visit status.aircall.io for service outages

## Version History

- **v2.0.0** - Bulletproof visibility refactor with centralized workspace management
- **v2.1.0** - Added comprehensive fix plan with SDK invocation, error boundary, and debug panel
- **v2.2.0** - Fixed infinite recursion with guard flags, added reconnection debounce, enhanced debug panel
