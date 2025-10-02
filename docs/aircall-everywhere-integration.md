# Aircall Everywhere Integration - Implementation Guide

## Overview

This document describes the complete Aircall Everywhere integration for a unified agent desktop experience with embedded calling capabilities.

## Architecture

### Core Components

1. **Phone Manager (`src/lib/aircall-phone.ts`)**
   - Manages Aircall Everywhere SDK lifecycle
   - Provides call control methods (answer, reject, hang up, dial)
   - Handles event listeners and SDK state

2. **Event Bridge (`src/lib/aircall-event-bridge.ts`)**
   - Deduplicates events from webhooks and SDK
   - Prevents double processing of call events
   - Maps external events to internal event types

3. **Phone Hook (`src/hooks/useAircallPhone.tsx`)**
   - React integration for Aircall SDK
   - Manages connection state and reconnection logic
   - Exponential backoff for network issues
   - Provides call control actions to components

4. **Customer Context (`src/hooks/useCallCustomerContext.tsx`)**
   - Zustand store for persisting call context
   - Pre-fetches Noddi customer data
   - Maintains customer information throughout call lifecycle

### UI Components

1. **AircallPhoneBar**
   - Fixed bottom bar showing call status
   - Displays connection indicator
   - Provides inline call controls
   - Expandable customer context panel
   - Keyboard shortcuts button

2. **ActiveCallContext**
   - Real-time customer information display
   - Priority bookings and unpaid alerts
   - Live note-taking without leaving call view
   - Optimized with React.memo for performance

3. **PostCallActions**
   - Dialog appears after call completion
   - Quick actions: notes, callbacks, tasks, email
   - Workflow continuity without context switching

4. **CallControls**
   - Reusable call control component
   - Agent transfer selector with availability
   - Hold/Resume, Mute/Unmute actions
   - Compact and full variants

5. **IncomingCallModal**
   - Displays on incoming calls
   - Shows pre-fetched customer data
   - Prominent priority booking alerts
   - Answer in browser option

6. **VoiceErrorBoundary**
   - Catches errors in voice components
   - Graceful fallback UI
   - Recovery options for users

## Features

### Phase 1: Foundation & SDK Setup
✅ Aircall Everywhere SDK integration
✅ Phone manager wrapper with event handling
✅ Admin UI for configuration
✅ Authentication and session management
✅ Event bridge for webhook↔SDK synchronization

### Phase 2: Embedded Phone UI
✅ Fixed bottom phone bar
✅ Inline call control buttons
✅ Responsive design
✅ Layout adjustments for phone bar

### Phase 3: Enhanced Customer Context
✅ Pre-fetch Noddi data on call start
✅ Customer context persistence
✅ Live note-taking during calls
✅ Priority booking display
✅ Unpaid bookings warnings

### Phase 4: Workflow Optimization
✅ Post-call actions dialog
✅ Keyboard shortcuts (Ctrl+Shift+A/H/M/P/T/N)
✅ Call transfer with agent selector
✅ Hold/Resume functionality
✅ Quick actions integration

### Phase 5: Polish & Testing
✅ Error handling with fallbacks
✅ Reconnection logic with exponential backoff
✅ Performance optimization (memoization)
✅ Error boundaries for graceful degradation
✅ Network error handling

## Configuration

### Admin Settings

Navigate to Admin Portal > Aircall Settings to configure:

```typescript
interface AircallEverywhereConfig {
  enabled: boolean;
  apiId: string;        // From Aircall Everywhere dashboard
  apiToken: string;     // From Aircall Everywhere dashboard
  domainName?: string;  // Optional custom domain
}
```

### Required Secrets

No additional secrets required beyond voice integration configuration.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+A` | Answer incoming call |
| `Ctrl+Shift+H` | Hang up / End call |
| `Ctrl+Shift+M` | Toggle mute |
| `Ctrl+Shift+P` | Toggle hold (pause) |
| `Ctrl+Shift+T` | Initiate transfer |
| `Ctrl+Shift+N` | Add quick note |
| `Ctrl+Shift+?` | Show shortcuts help |

## Error Handling

### Connection Issues

The system implements automatic reconnection with exponential backoff:
- Max 5 reconnection attempts
- Base delay: 1 second
- Exponential backoff: 2^attempt * base delay
- User notifications for connection status

### Error Recovery

- Error boundaries catch component errors
- Fallback UI provides recovery options
- Graceful degradation when SDK unavailable
- User-friendly error messages

## Performance Optimizations

1. **React.memo** on expensive components
2. **useMemo** for derived state calculations
3. **useCallback** for stable function references
4. **Lazy loading** for voice interface
5. **Memoized loading fallbacks**

## Testing Scenarios

### Happy Path
1. Initialize SDK successfully
2. Receive incoming call
3. Answer call with customer context
4. View Noddi data during call
5. Add notes while on call
6. End call
7. Complete post-call actions

### Error Scenarios
1. SDK initialization failure
2. Network disconnection during call
3. Reconnection with exponential backoff
4. Missing customer data
5. Transfer to unavailable agent
6. Component error recovery

### Edge Cases
1. Rapid successive calls
2. Call transfer interruptions
3. Browser refresh during active call
4. Multiple tabs open simultaneously
5. Network instability

## Browser Requirements

### Supported Browsers

**Fully Supported:**
- Google Chrome (latest version) - **Recommended**
- Microsoft Edge (Chromium-based)

**Not Supported:**
- Safari (all versions) - blocks third-party cookies by default
- Firefox - Enhanced Tracking Protection blocks required features
- Brave - Requires shields to be disabled
- Internet Explorer - Not supported

### Third-Party Cookies Requirement

Aircall Everywhere **requires third-party cookies** to function. This is because:
- The SDK runs in an embedded iframe from `phone.aircall.io`
- Authentication tokens must be shared across domains
- Real-time event synchronization needs cross-origin storage

#### How to Enable Third-Party Cookies

**Chrome:**
1. Go to Settings → Privacy and Security → Cookies
2. Select "Allow all cookies" OR
3. Add `phone.aircall.io` to "Sites that can always use cookies"
4. Restart Chrome

**Edge:**
1. Go to Settings → Cookies and site permissions
2. Disable "Block third-party cookies"
3. Restart Edge

**Safari (Not Recommended):**
- Safari blocks third-party cookies by default for privacy (ITP)
- This cannot be disabled for individual sites
- **Use Chrome instead for Aircall integration**

**Firefox:**
1. Go to Settings → Privacy & Security
2. Set Enhanced Tracking Protection to "Standard"
3. Restart Firefox

**Brave:**
1. Click Brave Shields icon in address bar
2. Set to "Shields Down" for this site
3. Alternatively, go to Settings and allow all cookies

## Network and Firewall Requirements

If your organization has strict firewall rules, ensure these domains are whitelisted:

**Required Domains:**
- `phone.aircall.io` - Aircall Everywhere SDK
- `api.aircall.io` - Aircall REST API
- `*.supabase.co` - Edge function for credential testing

**Ports:**
- HTTPS (443) - All Aircall communication
- WSS (443) - WebSocket for real-time events

## Troubleshooting

### SDK Not Initializing
- **Check API credentials** in Admin Settings → Aircall Everywhere
- **Test credentials** using the "Test Credentials" button
- Verify browser is Chrome or Edge (latest version)
- Check console for initialization errors
- Ensure third-party cookies are enabled

### 401 Authentication Errors

**Possible Causes:**

1. **Invalid Credentials**
   - API ID or API Token is incorrect
   - Credentials expired or revoked
   - **Solution:** Test credentials in Admin Settings, regenerate if needed

2. **Third-Party Cookies Blocked**
   - Browser blocking cross-origin cookies
   - Privacy extensions interfering
   - **Solution:** Enable third-party cookies (see above), disable privacy extensions

3. **Session Expired**
   - Aircall session timed out
   - User logged out of Aircall
   - **Solution:** Refresh page, re-authenticate with Aircall

4. **Network/Firewall Blocking**
   - Corporate firewall blocking `phone.aircall.io`
   - Proxy interfering with authentication
   - **Solution:** Whitelist required domains, check with IT

### Connection Lost
- System automatically attempts reconnection
- Check network connectivity
- Ensure `phone.aircall.io` is accessible
- Refresh page if reconnection fails after 5 attempts

### Customer Data Not Loading
- Verify Noddi API key is configured
- Check customer email/phone exists in database
- Review edge function logs for errors
- Ensure customer record is linked to call

### Call Controls Not Working
- Ensure SDK is initialized (green indicator in phone bar)
- Verify browser permissions for microphone/audio
- Check Aircall account has active phone lines
- Test credentials in Admin Settings

### Cookie Detection Issues
- Run the built-in cookie detection before SDK initialization
- If detection fails, manually verify browser settings
- Use Chrome for most reliable experience
- Check for browser extensions blocking cookies

## Future Enhancements

1. **Call Recording**
   - Integrate with Aircall recording API
   - Display recording status during calls
   - Access recordings from call history

2. **Call Analytics**
   - Track call durations and outcomes
   - Agent performance metrics
   - Customer satisfaction scoring

3. **Advanced Transfer**
   - Transfer with consultation
   - Conference calling
   - Queue management

4. **Mobile Support**
   - Progressive Web App (PWA)
   - Mobile-optimized UI
   - Native app integration

## Support

For issues or questions:
- Check browser console for errors
- Review edge function logs
- Verify Aircall Everywhere dashboard settings
- Contact support with error details

## Resources

- [Aircall Everywhere Documentation](https://developer.aircall.io/docs/aircall-everywhere)
- [Aircall SDK Reference](https://developer.aircall.io/docs/sdk-reference)
- [Aircall API Documentation](https://developer.aircall.io/docs/api-reference)
