

## Plan: Secondary Workspace Setup Wizard

Currently the "Product Team Workspace" section shows a bare token input (as seen in the screenshot). We need a proper step-by-step wizard — similar to the existing `SlackSetupWizard` — but tailored for the secondary workspace, explaining exactly what scopes are needed for daily digest and critical alerts.

### What to build

A new `SecondarySlackSetupWizard` component with 4 steps:

**Step 0 — Introduction**: Explain the purpose (product/engineering team visibility into customer issues without needing support hub access). List what they'll get: daily digest summaries and real-time critical alerts.

**Step 1 — Create Slack App**: Guide them to create a new Slack app in their **product team's workspace** (not the support workspace). Emphasize this is a separate workspace. Link to `https://api.slack.com/apps`. Suggest naming it e.g. "Support Alerts".

**Step 2 — Add Scopes & Install**: List the required scopes specifically for digest/critical features:
- `channels:read` — list channels for configuration
- `groups:read` — list private channels
- `chat:write` — post digest summaries and critical alerts

Provide a copy button for scopes. Then instruct them to install the app to the workspace.

**Step 3 — Paste Token**: Token input field (same UX as the primary wizard — show/hide toggle, `xoxb-` validation, connect button).

### Integration

Replace the bare token input in `SlackIntegrationSettings.tsx` (lines 304-331) with the new wizard component. When secondary workspace is already connected, keep the current connected state display (lines 282-303).

### Files changed

| File | Change |
|---|---|
| New: `src/components/admin/SecondarySlackSetupWizard.tsx` | 4-step wizard for secondary workspace setup |
| `src/components/admin/SlackIntegrationSettings.tsx` | Replace bare token input with the new wizard component |

