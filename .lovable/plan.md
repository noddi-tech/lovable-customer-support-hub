

## Fix Voice Calls Crash + Sidebar Auto-Collapse

### Issue 1: Voice Calls crash — zero functionality change

Move the voice rendering decision from `EnhancedInteractionsLayout` up to `Index.tsx`. The same `VoiceDashboard` component renders identically — we just avoid running conversation-specific hooks that can crash on the voice route.

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add `if (subSection === 'voice')` before the `EnhancedInteractionsLayout` fallthrough, rendering `VoiceDashboard` directly (same pattern as `chat`, `voice-analytics`, `voice-settings`) |
| `src/components/dashboard/EnhancedInteractionsLayout.tsx` | Remove the now-dead `activeSubTab === 'voice'` early-return block |

### Issue 2: Sidebar auto-collapse on all nav clicks

| File | Change |
|------|--------|
| `src/components/layout/AppMainNav.tsx` | Add `onClick` handler on every `NavLink` that calls `setOpenMobile(false)` when on mobile |

