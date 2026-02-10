

# AI Assistant Flow Builder

## Overview

Create a new "AI Flow" tab in the widget admin where you can visually configure how the AI assistant behaves at each stage of a customer conversation. Instead of the current hardcoded system prompt, the flow will be stored as a JSON structure in the database and injected into the system prompt dynamically.

## How It Works

The flow builder presents a vertical decision tree with configurable nodes. Each node represents a stage in the conversation, with conditions and actions. The saved flow is stored as JSON on the `widget_configs` table and read by the `widget-ai-chat` edge function to build a dynamic system prompt.

## Flow Structure

The default flow will mirror the current hardcoded behavior but make it editable:

```text
[Customer Opens Widget]
       |
       v
[Unverified] -----> Answer general FAQs from knowledge base
       |              If account question -> prompt to verify phone
       v
[Phone Verified]
       |
       v
[Lookup Customer] 
       |
       +-- Has upcoming bookings?
       |     YES -> Mention briefly, ask if they need help
       |     NO  -> Skip
       |
       +-- Multiple vehicles?
       |     YES -> Ask "Which car?"
       |     NO  -> Continue with single vehicle
       |
       v
[Present Action Menu]
  - Book new service
  - View my bookings
  - Modify/cancel booking
  - Wheel storage (dekkhotell)
       |
       v
[Booking New Service]
       |
       +-- Has previous orders?
             YES -> "Want something similar to your last order?"
             NO  -> Guide through options
```

## Database Change

Add a `ai_flow_config` JSONB column to `widget_configs`:

```sql
ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS ai_flow_config JSONB DEFAULT NULL;
```

The JSON schema for flow nodes:

```json
{
  "nodes": [
    {
      "id": "post_verification",
      "label": "After Phone Verification",
      "instruction": "Greet customer by name. Look up their account.",
      "conditions": [
        {
          "id": "has_upcoming",
          "check": "Customer has upcoming bookings",
          "if_true": "Mention upcoming bookings briefly (date + service). Ask if they need help with any.",
          "if_false": "Skip, don't mention bookings."
        },
        {
          "id": "multiple_vehicles",
          "check": "Customer has multiple vehicles",
          "if_true": "Ask which car they want help with before proceeding.",
          "if_false": "Continue with their single vehicle."
        }
      ]
    },
    {
      "id": "action_menu",
      "label": "Present Action Choices",
      "instruction": "After greeting, present these options as a short list:",
      "actions": [
        { "id": "book_new", "label": "Bestille ny service", "enabled": true },
        { "id": "view_bookings", "label": "Se mine bestillinger", "enabled": true },
        { "id": "modify_cancel", "label": "Endre/avbestille", "enabled": true },
        { "id": "wheel_storage", "label": "Dekkhotell", "enabled": true }
      ]
    },
    {
      "id": "booking_new",
      "label": "When Booking New Service",
      "conditions": [
        {
          "id": "has_previous",
          "check": "Customer has previous completed orders",
          "if_true": "Reference most recent order and ask: 'Vil du ha noe lignende?'",
          "if_false": "Guide them through available services."
        }
      ]
    }
  ],
  "general_rules": {
    "max_initial_lines": 4,
    "never_dump_history": true,
    "tone": "Friendly, concise, action-oriented"
  }
}
```

## New Files

### `src/components/admin/widget/AiFlowBuilder.tsx`

A visual flow editor component with:
- Vertical card-based layout showing each flow node as a card
- Each node card shows its label, instruction text (editable), and conditions
- Conditions displayed as "IF ... THEN ... ELSE ..." blocks with editable text fields
- Action menu node shows toggleable action items (enable/disable with switches)
- "General Rules" section at the bottom for tone, max lines, and behavior flags
- Save button that writes the JSON to `widget_configs.ai_flow_config`
- Reset button to restore defaults

The UI uses existing components: Card, Input, Textarea, Switch, Button, and connecting lines (CSS borders/pseudo-elements) between nodes to create the flowchart feel.

### Changes to Existing Files

**`src/components/admin/widget/WidgetSettings.tsx`**
- Add a new tab "Flow" (with a GitBranch icon) in the TabsList
- Render `AiFlowBuilder` in the new tab, passing `selectedWidget` and `handleUpdateWidget`

**`supabase/functions/widget-ai-chat/index.ts`**
- In `buildSystemPrompt`, read the `ai_flow_config` from the widget config (passed through from the main handler)
- If `ai_flow_config` exists, dynamically build the verified-user prompt from the flow nodes instead of using the hardcoded text
- If `ai_flow_config` is null, fall back to the current hardcoded prompt (backward compatible)

**`supabase/functions/widget-ai-chat/index.ts`** (main handler)
- Fetch `ai_flow_config` alongside other widget config fields
- Pass it to `buildSystemPrompt`

## Migration

One SQL migration to add the column:

```sql
ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS ai_flow_config JSONB DEFAULT NULL;

COMMENT ON COLUMN widget_configs.ai_flow_config IS 
  'JSON configuration for AI assistant conversation flow. When set, overrides default hardcoded flow.';
```

## Summary

| File | Change |
|------|--------|
| Migration SQL | Add `ai_flow_config` JSONB column to `widget_configs` |
| `src/components/admin/widget/AiFlowBuilder.tsx` | New visual flow editor component |
| `src/components/admin/widget/WidgetSettings.tsx` | Add "Flow" tab, render AiFlowBuilder |
| `supabase/functions/widget-ai-chat/index.ts` | Read flow config, build dynamic system prompt from it |

