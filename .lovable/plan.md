

# Diagnosing: Navio Workspace Not Finding New Channels

## Investigation Summary

The code and database configuration look correct:
- The secondary workspace (Navio, team ID `T02KWR5S290`) is properly connected with a valid token
- The `slack-list-channels` edge function fetches both public and private channels using `conversations.list`
- The UI doesn't filter channels — it shows everything returned by Slack
- React Query has no aggressive caching that would prevent refetching

## Most Likely Cause

The Slack `conversations.list` API only returns channels that the **bot can see**:
- **Public channels**: always returned, but bot may not be a member
- **Private channels**: only returned if the bot has been **invited** to them

If the new channels in the Navio workspace are **private**, someone needs to invite the "Support Alerts" bot to those channels in Slack.

If the channels are **public**, the issue could be a **stale/revoked token**. The secondary token was saved once and never refreshed — if someone reinstalled or rotated the Slack app, the stored token would be invalid.

## Plan

### 1. Add better error logging to the edge function
In `supabase/functions/slack-list-channels/index.ts`, add a `console.log` showing how many channels were returned and any Slack API errors, so we can see what's happening in the logs.

### 2. Test the token validity
Call Slack's `auth.test` with the secondary token before fetching channels — if the token is invalid, return a clear error message like "Token expired or revoked" instead of silently returning an empty list.

### 3. Add a "Refresh Channels" button feedback
Currently the refresh button exists but gives no feedback on what happened. Add a toast showing "Found X channels" or "Error: ..." after the refetch completes.

## Technical Details

**File: `supabase/functions/slack-list-channels/index.ts`**
- Before calling `conversations.list`, call `auth.test` with the token to verify it's still valid
- Log the channel count: `console.log('Fetched ${channels.length} channels from ${useSecondary ? 'secondary' : 'primary'} workspace')`
- If `auth.test` fails, return `{ error: 'Token is invalid or expired. Please reconnect the workspace.', channels: [] }`

**File: `src/hooks/useSlackIntegration.ts`**
- No changes needed — the refetch mechanism works correctly

**Redeploy**: `slack-list-channels` edge function

This will give us visibility into whether the token works and what Slack is actually returning.

