
# Plan: Add Phone Availability Toggle

## Overview

Add a phone login/logout toggle in the sidebar alongside the existing chat availability toggle. This will allow agents to manage both chat and phone availability from a single location in the sidebar.

## Current State Analysis

### Chat Availability Toggle (Existing)
- Located in `AgentStatusToggle.tsx` component
- Uses `useAgentAvailability` hook which stores status in `profiles.chat_availability` 
- Shows Online/Away/Offline status with colored indicators
- Displays other online agents

### Phone/Aircall Integration (Existing)
- Uses `AircallContext` for SDK management
- Login state tracked via `isConnected` boolean
- Login flow triggered via floating button or modal
- No database field for phone availability status
- Phone availability is tied to Aircall SDK connection state

## Design Approach

### Option A: Unified Availability Component (Recommended)
Create a single `AgentAvailabilityPanel` component that shows both:
1. **Chat availability** - dropdown (Online/Away/Offline)
2. **Phone availability** - toggle switch (Logged In/Logged Out)

This keeps everything in one place and matches the user's mental model of "going online" for work.

### Component Layout (Expanded Sidebar)
```text
┌──────────────────────────────┐
│ AVAILABILITY                 │
├──────────────────────────────┤
│ 💬 Chat                      │
│ [●] Online for chat       ▼  │  ← Dropdown
├──────────────────────────────┤
│ 📞 Phone                     │
│ [ Login to Aircall ]         │  ← Button when not connected
│ [●] Logged in    [Logout]    │  ← When connected
├──────────────────────────────┤
│ Online now: Ana, Marcus      │  ← Team status
└──────────────────────────────┘
```

### Component Layout (Collapsed Sidebar)
Show combined status indicator with the most important status visible.

## Implementation Details

### 1. Create New Component: `AgentAvailabilityPanel.tsx`

**Location:** `src/components/layout/AgentAvailabilityPanel.tsx`

This component will:
- Import and use `useAgentAvailability` for chat status
- Import and use `useAircallPhone` for phone connection status
- Render two sections: Chat and Phone availability
- Handle phone login/logout via Aircall context methods
- Show team availability summary

**Key functionality:**
```typescript
// Phone login button - triggers Aircall workspace modal
const handlePhoneLogin = () => {
  openLoginModal(); // From useAircallPhone context
};

// Phone logout - disconnects from Aircall
const handlePhoneLogout = () => {
  // Will need to add a logout function to AircallContext
};
```

### 2. Update `AircallContext.tsx` - Add Logout Function

Add a `logout` function to the context that:
1. Clears the SDK login status
2. Updates local state to disconnected
3. Optionally hides the workspace

```typescript
const logout = useCallback(() => {
  console.log('[AircallProvider] 🚪 Manual logout requested');
  aircallPhone.clearLoginStatus();
  setIsConnected(false);
  setInitializationPhase('needs-login');
  hideAircallWorkspace();
  
  toast({
    title: 'Logged out of Aircall',
    description: 'You will not receive phone calls until you log in again',
  });
}, [hideAircallWorkspace, toast]);
```

### 3. Update `AppMainNav.tsx`

Replace `AgentStatusToggle` with the new `AgentAvailabilityPanel`:

```typescript
// Before:
<AgentStatusToggle collapsed={isCollapsed} />

// After:
<AgentAvailabilityPanel collapsed={isCollapsed} />
```

### 4. Conditional Phone Section

Only show phone availability section if:
1. Aircall integration is configured and active for the organization
2. The current user has permission to use voice features

```typescript
const { getIntegrationByProvider } = useVoiceIntegrations();
const aircallConfig = getIntegrationByProvider('aircall');
const hasActiveVoiceIntegration = aircallConfig?.is_active && 
  aircallConfig?.configuration?.aircallEverywhere?.enabled;
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/layout/AgentAvailabilityPanel.tsx` | Create | New unified availability component |
| `src/components/layout/AppMainNav.tsx` | Modify | Use new panel instead of AgentStatusToggle |
| `src/contexts/AircallContext.tsx` | Modify | Add `logout` function to context |
| `src/hooks/useAircallPhone.tsx` | None | Already exports context (no changes needed) |

## Component Structure

```typescript
// AgentAvailabilityPanel.tsx structure

interface AgentAvailabilityPanelProps {
  collapsed?: boolean;
  className?: string;
}

export const AgentAvailabilityPanel: React.FC<AgentAvailabilityPanelProps> = ({
  collapsed = false,
  className
}) => {
  // Chat availability (existing hook)
  const { status: chatStatus, setStatus: setChatStatus, isUpdating: chatUpdating } = useAgentAvailability();
  
  // Phone availability (from Aircall context)
  const { 
    isConnected: phoneConnected, 
    isInitialized: phoneInitialized,
    openLoginModal,
    logout,
    initializationPhase
  } = useAircallPhone();
  
  // Check if Aircall is configured
  const { getIntegrationByProvider } = useVoiceIntegrations();
  const aircallConfig = getIntegrationByProvider('aircall');
  const showPhoneSection = aircallConfig?.is_active && 
    aircallConfig?.configuration?.aircallEverywhere?.enabled;

  // Render unified panel...
};
```

## UI/UX Considerations

1. **Visual Hierarchy**: Chat is primary (most common), phone secondary
2. **Collapsed State**: Show combined indicator (e.g., green dot if both online, split indicator if mixed)
3. **Loading States**: Show spinners during login/status changes
4. **Error States**: Handle Aircall initialization failures gracefully
5. **Tooltips**: Explain what each toggle does on hover

## Edge Cases

1. **Aircall not configured**: Hide phone section entirely
2. **Aircall initialization failed**: Show "Phone Unavailable" with retry option
3. **Network issues**: Handle offline scenarios gracefully
4. **Multiple browser tabs**: State should sync across tabs

## Testing Checklist

After implementation:
- [ ] Chat toggle works as before (Online/Away/Offline)
- [ ] Phone login button triggers Aircall workspace/modal
- [ ] Phone logout button disconnects from Aircall
- [ ] Status persists after page refresh
- [ ] Collapsed sidebar shows appropriate indicators
- [ ] Phone section hidden when Aircall not configured
- [ ] Online agents list still works
