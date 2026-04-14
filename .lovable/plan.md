

# Fix: Agent name showing in reply emails despite being configured off

## Problem
When `include_agent_name` is toggled off in the email template, the agent's full name still appears in the email. This happens because there are **two places** the agent name leaks through:

1. **The "From" header** (line 459): `from: { name: senderDisplayName }` — the `senderDisplayName` resolution chain (lines 195-230) falls back to the agent's full name (line 225) when no other display name is configured at the inbound route, inbox, or organization level.

2. **The AI draft body** (separate function): The AI system prompt tells it to "Sign off with a friendly closing" — already covered by the previous plan.

The `include_agent_name` toggle only controls the `{{agent_name}}` placeholder in the signature template body. It does NOT prevent the agent name from appearing in the email's "From" field.

## Solution

### 1. Respect `include_agent_name` for the From header display name
**File: `supabase/functions/send-reply-email/index.ts`** (lines 224-227)

Skip the "Priority 4: agent's full name" fallback when `include_agent_name` is false in the template. Move the sender display name resolution to after the template is loaded (currently it's before), or check the template setting before applying Priority 4.

Concretely: after the template is loaded (line 258), add a check — if `templateSettings.include_agent_name === false`, don't use the agent name as senderDisplayName. Instead fall through to the "Support" fallback.

```typescript
// After template is loaded (line 258+):
// If include_agent_name is off AND senderDisplayName came from agent name, reset it
if (templateSettings.include_agent_name === false && senderDisplayName === senderInfo?.full_name) {
  senderDisplayName = null;
}
senderDisplayName = senderDisplayName || 'Support';
```

### 2. Update AI draft system prompt (from previous plan)
**File: `supabase/functions/generate-email-draft/index.ts`** (line 18)

Change sign-off instruction to:
```
Do NOT include any sign-off, closing, or signature. The email system adds signatures automatically.
```

### 3. Redeploy both edge functions

### Files to modify
- `supabase/functions/send-reply-email/index.ts` — respect `include_agent_name` for From header display name
- `supabase/functions/generate-email-draft/index.ts` — remove sign-off instruction from system prompt

