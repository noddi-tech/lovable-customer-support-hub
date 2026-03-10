

## Bug Fix: Duplicate `token` variable in `slack-list-channels`

### Root Cause

The `slack-list-channels` edge function has two `const token` declarations:
- **Line 27**: `const token = authHeader.replace('Bearer ', '');` — the auth JWT
- **Line 57**: `const token = useSecondary ? ...` — the Slack bot token

This causes a JavaScript runtime error (`SyntaxError: Identifier 'token' has already been declared`), which means the function crashes before it can fetch any channels. That is why the channel dropdowns are empty.

### Fix

Rename line 27 from `token` to `authToken` (or `jwt`), so there is no conflict with the Slack bot token variable on line 57.

### Files changed

| File | Change |
|---|---|
| `supabase/functions/slack-list-channels/index.ts` | Rename first `token` to `authToken` on lines 27-28 |

This is a one-line rename — no other logic changes needed. After deploying, the channel lists for both primary and secondary workspaces should populate correctly.

