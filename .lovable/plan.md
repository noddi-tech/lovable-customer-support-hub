

## Fix Email Default + Update Slack Scopes

Two small changes, then redeploy.

### 1. Default email notifications to ON

**File:** `supabase/functions/process-mention-notifications/index.ts` (line 323)

Change:
```typescript
const emailEnabled = preferences?.email_on_mention ?? false;
```
to:
```typescript
const emailEnabled = preferences?.email_on_mention ?? true;
```

This ensures all users get mention emails by default, even if they haven't explicitly saved preferences yet.

### 2. Update Slack setup wizard scopes

**File:** `src/components/admin/SlackSetupWizard.tsx` (lines 35-40)

Add `users:read.email` and `im:write` to `REQUIRED_SCOPES`:
```typescript
const REQUIRED_SCOPES = [
  'channels:read',
  'chat:write',
  'users:read',
  'users:read.email',
  'groups:read',
  'im:write',
];
```

This ensures future setup flows reference the correct scopes. Since you've already added these scopes and reinstalled, Slack DMs should start working immediately after deployment.

### 3. Deploy

Redeploy `process-mention-notifications` so the email default fix takes effect.

