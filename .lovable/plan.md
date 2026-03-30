

## Fix: Consistent fade-in animation for all sidebar navigation

### Root Cause

The `key` in `UnifiedAppLayout.tsx` is based on the top-level route segment (`interactions`, `marketing`, `operations`). When navigating between items within the same section (e.g., Text Messages → Voice Calls → Chat — all under `/interactions`), the key doesn't change, so no animation replays. Cross-section navigation (e.g., Text Messages → Newsletters) does change the key, producing a visible fade-in.

### Fix

Use a more granular key that changes on every sub-route navigation, not just top-level section changes.

| # | File | Change |
|---|------|--------|
| 1 | `src/components/layout/UnifiedAppLayout.tsx` | Change key from `section` (top-level segment only) to the full second-level path segment, e.g. `location.pathname.split('/').slice(0, 3).join('/')`. This ensures Text→Voice→Chat all get different keys and replay the fade-in. |

The key derivation changes from:
```
/interactions/text  → "interactions"
/interactions/voice → "interactions"  (same — no animation)
```
To:
```
/interactions/text  → "/interactions/text"
/interactions/voice → "/interactions/voice"  (different — animation plays)
/marketing/campaigns → "/marketing/campaigns"
```

Single line change. No new dependencies. No behavior change beyond consistent animation.

