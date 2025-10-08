# Aircall Integration Troubleshooting Guide

## Prerequisites

Before troubleshooting Aircall integration issues, ensure you have:

- **React Query 5.90.2+** - Version mismatch can cause initialization failures
- **Chrome browser** - Recommended for best compatibility
- **Third-party cookies enabled** - Required for Aircall SDK
- **No ad blockers** - Can interfere with aircall.io domains
- **Valid API credentials** - API ID and API Token from Aircall dashboard

## Common Issues

### 1. SDK Not Mounting Iframe (CRITICAL) - FIXED

**Symptoms:**
- "Select your language" dialog visible but not clickable
- 401 errors flooding the console from workspace.aircall.io
- Console shows "Module 'service' is not yet registered"
- Warnings about "Workspace has not been identified yet"
- "Show Aircall" button does nothing

**Root Cause:**
The `showWorkspace()` and `hideWorkspace()` methods in `src/lib/aircall-phone.ts` were only manipulating CSS without calling the actual Aircall SDK methods. This meant the iframe was never truly mounted or authenticated. The SDK's `show()` and `hide()` methods do more than just CSS - they:
- Mount/unmount the iframe properly
- Establish WebSocket connections for real-time events
- Trigger authentication flows
- Initialize audio contexts
- Register service modules

**Fix Applied:**
1. **Direct SDK Calls**: Updated `showWorkspace()` and `hideWorkspace()` to call the SDK's `show()` and `hide()` methods (or `open()`/`close()` for compatibility) before adjusting CSS
2. **Method Detection**: Added logging to inspect available workspace methods after initialization
3. **Blocking Check Removed**: Converted `!isInitialized` check to a warning so the SDK can always be attempted
4. **Workspace Ready Tracking**: Added `isWorkspaceReady` flag that's set in the `onLogin` callback to reflect actual authentication state

**Verification:**
After the fix:
1. Check console for "✅ Called workspace.show()"
2. No more 401 errors
3. Language selector becomes clickable
4. Audio context warnings may persist but are harmless (they're triggered after user interaction)

### 2. Infinite Recursion / Event Loop - FIXED

**Symptoms:**
- Browser freezes or becomes unresponsive
- Console shows "Maximum call stack size exceeded"
- Hundreds of identical log messages flooding the console
- Page crashes or automatically reloads
- Workspace never appears despite clicking "Show Aircall"

**Root Cause:**
The `showWorkspace()` and `hideWorkspace()` methods were dispatching custom events that were caught by event listeners that called the same functions again, creating an infinite loop.

**Fix Applied:**
1. **Direct SDK Calls**: Modified methods to call SDK directly instead of dispatching events
2. **Event Listeners Removed**: Removed the circular event listeners from `AircallContext.tsx`
3. **Recursion Guards**: Added `isShowingWorkspaceRef` and `isHidingWorkspaceRef` flags

**Verification:**
- Check console logs for "✅ Called workspace.show()"
- No more event dispatch messages
- Workspace container should now be visible when clicking "Show Aircall"

### 3. Workspace Not Loading (401 Errors)

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

### 4. React Query Version Mismatch

**Symptoms:**
- Error: `_a.isStatic is not a function`
- Aircall initialization crashes
- Blank screen or app crash

**Solution:**

Ensure both React Query packages are at the same version:
```bash
npm install @tanstack/react-query@^5.90.2 @tanstack/react-query-devtools@^5.90.2
```

### 5. SDK Not Initializing

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

### 6. Calls Not Showing / Answering

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

### 7. Reconnection Issues

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
| `isWorkspaceReady` | Workspace iframe is mounted and authenticated | All phone operations |

**All three must be true** before you can make or receive calls.

## Debug Mode

### Enable Debug Panel

Add `?debug=aircall` to your URL in any environment, or it's automatically enabled in development mode.

### Debug Panel Features

- **Real-time status indicators** - Visual badges for initialization, connection, and readiness
- **Phase tracking** - Shows current initialization phase
- **SDK Method Detection** - Logs available workspace methods to console for debugging
- **Current call info** - Displays active call ID if present
- **DOM diagnostics** - Shows container, iframe, and pointer-events status
- **Copy debug info** - Button to copy full diagnostic data to clipboard
- **Force fix** - Button to reset pointer-events to auto (useful for stuck states)
- **Force Reinitialize** - Button to clear all Aircall cache and reload page (useful for stuck initialization)

**When to Use Force Reinitialize:**
- Workspace is stuck at "Initializing" phase
- 401 errors persist after credential updates
- SDK appears to be in a corrupted state
- After making changes to voice integration settings

This clears all cached state:
- `aircall_login_status`
- `aircall_connection_timestamp`
- `aircall_connection_attempts`
- `last_reconnect_attempt`
- `aircall_workspace_visible`

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
- **v2.3.0** - **CRITICAL FIX**: Implemented actual SDK method invocation instead of CSS-only manipulation, updated isWorkspaceReady tracking, removed blocking checks
