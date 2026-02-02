
# Fix: Sidebar Phone Login Button and Collapsed View Not Working

## Problem Summary

The user reported two issues with the Agent Availability Panel:

1. **Collapsed sidebar icon is not clickable** - The grey status indicator icon in the collapsed sidebar cannot be clicked to open a login modal or change availability status
2. **"Login to Aircall" button doesn't work** - Clicking the button in the expanded sidebar has no effect

## Root Cause Analysis

### Issue 1: Collapsed View is Static (Non-Interactive)
In `AgentAvailabilityPanel.tsx`, when `collapsed` is true (lines 104-124), the component returns a static `div` with status indicators but **no click handlers** or interactive elements:

```typescript
// Current code - static, no interaction
if (collapsed) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative p-1" title="...">
        <Circle className={cn("h-4 w-4 fill-current", currentChatConfig.color)} />
        {showPhoneSection && (
          <div className={cn("absolute ...")} />
        )}
      </div>
    </div>
  );
}
```

### Issue 2: Wrong Function Called for Phone Login
The `handlePhoneLogin` function (lines 78-81) calls `showAircallWorkspace(true)` instead of using the proper `openLoginModal` function from the context:

```typescript
// Current code - incorrect
const handlePhoneLogin = () => {
  console.log('[AgentAvailabilityPanel] Phone login requested');
  showAircallWorkspace(true);  // Only shows workspace, doesn't trigger full login flow
};
```

The `openLoginModal` function in `AircallContext.tsx` (lines 1333-1343) is the correct function because it:
1. Sets `initializationPhase` to `'needs-login'`
2. Calls `showAircallWorkspace(true)`
3. Shows a helpful toast notification

Additionally, `openLoginModal` is **not imported** in the destructuring from `useAircallPhone()` (lines 58-65).

## Solution

### 1. Fix Phone Login Handler
Update `handlePhoneLogin` to use the correct `openLoginModal` function from the context:

```typescript
// Import openLoginModal from context
const { 
  isConnected: phoneConnected, 
  isInitialized: phoneInitialized,
  initializationPhase,
  showAircallWorkspace,
  openLoginModal,        // ADD THIS
  initializePhone,       // ADD THIS - for first-time init
  logout: phoneLogout,
  error: phoneError,
} = useAircallPhone();

// Updated handler
const handlePhoneLogin = () => {
  console.log('[AgentAvailabilityPanel] Phone login requested');
  
  // If SDK not initialized yet, initialize first
  if (!phoneInitialized) {
    initializePhone();
    return;
  }
  
  // Otherwise open the login modal
  openLoginModal();
};
```

### 2. Make Collapsed View Interactive
Wrap the collapsed status indicator in a `Popover` that shows quick actions for both chat and phone:

```typescript
if (collapsed) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 relative hover:bg-muted"
          title={`Chat: ${chatStatus}${showPhoneSection ? `, Phone: ${phoneConnected ? 'logged in' : 'logged out'}` : ''}`}
        >
          {/* Status indicators */}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-56 p-3">
        {/* Chat status dropdown */}
        {/* Phone login/logout controls */}
      </PopoverContent>
    </Popover>
  );
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/AgentAvailabilityPanel.tsx` | 1. Add `openLoginModal` and `initializePhone` to destructuring<br>2. Fix `handlePhoneLogin` to use correct function<br>3. Wrap collapsed view in `Popover` with interactive controls |

## Implementation Details

### Updated Imports
```typescript
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
```

### Updated Context Destructuring
```typescript
const { 
  isConnected: phoneConnected, 
  isInitialized: phoneInitialized,
  initializationPhase,
  openLoginModal,      // NEW
  initializePhone,     // NEW
  logout: phoneLogout,
  error: phoneError,
} = useAircallPhone();
```

### Updated Phone Login Handler
```typescript
const handlePhoneLogin = () => {
  console.log('[AgentAvailabilityPanel] Phone login requested');
  
  if (!phoneInitialized) {
    console.log('[AgentAvailabilityPanel] SDK not initialized, initializing first');
    initializePhone();
    return;
  }
  
  openLoginModal();
};
```

### Updated Collapsed View (Popover)
The collapsed view will show a popover with:
- **Chat section**: Quick status buttons (Online/Away/Offline)
- **Phone section**: Login button or Logout button depending on connection state

## Expected Behavior After Fix

### Collapsed Sidebar
- Clicking the grey/colored status indicator opens a popover
- Popover shows chat availability options (Online/Away/Offline)
- Popover shows phone login button or logout button (if Aircall is configured)

### Expanded Sidebar
- "Login to Aircall" button properly triggers the Aircall login flow
- Shows the Aircall workspace widget for authentication
- Toast notification guides user to complete login

## Testing Checklist

After implementation:
- [ ] Click collapsed sidebar icon → popover opens
- [ ] Change chat status via popover → status updates
- [ ] Click phone login via popover → Aircall workspace appears
- [ ] "Login to Aircall" button in expanded view → triggers login flow
- [ ] Phone logout button works correctly
- [ ] Status indicators update correctly in both collapsed and expanded views
