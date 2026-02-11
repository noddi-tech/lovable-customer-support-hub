

# Comprehensive AI Chatbot Flow Builder Redesign

## Two Problems to Solve

### 1. Missing Admin Sidebar
The AI Chatbot page (`/admin/ai-chatbot`) renders `AiChatbotSettings` directly without wrapping it in `AdminPortalLayout`. Every other admin page goes through either `Settings` (which wraps in `AdminPortalLayout`) or wraps itself. This causes the sidebar to disappear when navigating to AI Chatbot.

**Fix**: Wrap `AiChatbotSettings` in `AdminPortalLayout` -- either in App.tsx or inside the component itself.

### 2. Flow Builder Redesign -- Visual Flowchart with Fully Dynamic Nodes

The current flow builder is a simple list of cards with IF/YES/NO conditions. The plan is to replace it with a proper **visual flowchart** inspired by the Master of Code reference, with:

- **Visual connected nodes** with lines/arrows showing the conversation path
- **Fully dynamic node types** -- no hardcoded "post_verification" or "action_menu" nodes. Users can add any node, choose its type, and define all content
- **Multiple node types**: Message, Decision (IF/YES/NO branching), Action Menu (toggle options), Data Collection (ask for phone, email, etc.), Escalation (hand off to human)
- **Drag-to-reorder** nodes in the flow
- **Each node fully editable** -- label, instruction, type, conditions, actions all configurable through the UI

## New Flow Architecture

### Node Types (user picks when adding a node)

| Type | Purpose | Configurable Fields |
|------|---------|-------------------|
| **Message** | Bot says something | Instruction text |
| **Decision** | IF/YES/NO branch | Condition check, YES action, NO action |
| **Action Menu** | Present choices to user | List of toggleable action items |
| **Data Collection** | Ask user for input | Field label, field type (phone, email, text), validation hint |
| **Escalation** | Hand off to human | Escalation message, trigger conditions |

### Updated JSON Schema

```json
{
  "nodes": [
    {
      "id": "node_1",
      "type": "message",
      "label": "Initial Greeting",
      "instruction": "Ask the customer how you can help them today.",
      "conditions": [],
      "actions": [],
      "data_fields": []
    },
    {
      "id": "node_2",
      "type": "data_collection",
      "label": "Ask for Phone Number",
      "instruction": "Ask the customer for their phone number to look up their account.",
      "data_fields": [
        { "id": "phone", "label": "Phone number", "field_type": "phone", "required": true }
      ]
    },
    {
      "id": "node_3",
      "type": "decision",
      "label": "Existing Customer?",
      "instruction": "Check if the customer exists in the system.",
      "conditions": [
        {
          "id": "cond_1",
          "check": "Customer found in system",
          "if_true": "Verify identity with SMS PIN code",
          "if_false": "Ask what service they are interested in"
        }
      ]
    }
  ],
  "general_rules": {
    "max_initial_lines": 4,
    "never_dump_history": true,
    "tone": "Friendly, concise, action-oriented",
    "language_behavior": "Match customer language",
    "escalation_threshold": 3
  }
}
```

### Visual Design

The flowchart uses a vertical layout with:
- Colored left border per node type (blue for message, amber for decision, green for action menu, purple for data collection, red for escalation)
- Vertical connector lines between nodes with arrow indicators
- A node type selector (dropdown) when adding or changing a node
- Drag handles for reordering (using existing @dnd-kit dependency)
- Each node is a card that expands to show its editable fields

## Changes

### File: `src/components/admin/AiChatbotSettings.tsx`
- Wrap content in `AdminPortalLayout` so the sidebar stays visible
- Remove the duplicate heading/description (AdminPortalLayout already provides the page context)

### File: `src/components/admin/widget/AiFlowBuilder.tsx`
Complete rewrite with:
- **Node type system**: Each node has a `type` field (message, decision, action_menu, data_collection, escalation)
- **Type-specific editors**: Different form fields render based on node type
- **Visual flowchart connectors**: Vertical lines with arrows, color-coded left borders per type
- **Add node dropdown**: When clicking "Add Step," a dropdown lets you pick the node type
- **Data collection fields**: A new `data_fields` array on nodes for collecting user input (phone, email, name, etc.)
- **Drag-and-drop reorder**: Using @dnd-kit/sortable (already installed)
- **No hardcoded defaults**: The DEFAULT_FLOW becomes a starter template that users can fully modify or clear. Every field is user-defined.

### File: `supabase/functions/widget-ai-chat/index.ts`
- Update `FlowNode` interface to include `type` and `data_fields`
- Update `buildFlowPrompt` to handle all node types:
  - `message` nodes become instruction lines
  - `decision` nodes become IF/THEN/ELSE blocks
  - `action_menu` nodes become option lists
  - `data_collection` nodes become "Ask the user for [field]" instructions
  - `escalation` nodes become "If [condition], hand off to human agent" instructions

### No database changes needed
The `ai_flow_config` JSONB column already stores arbitrary JSON, so the new schema works without migration.

## Technical Details

### Node Type Color Coding
- Message: `border-l-blue-500`
- Decision: `border-l-amber-500`
- Action Menu: `border-l-green-500`
- Data Collection: `border-l-purple-500`
- Escalation: `border-l-red-500`

### Drag and Drop
Uses `@dnd-kit/sortable` (already in dependencies) for reordering nodes. Each node card gets a drag handle grip icon.

### Dynamic Prompt Generation
The `buildFlowPrompt` function will iterate nodes by type and generate natural language instructions. Example output for a data_collection node:

```
### Ask for Phone Number
Ask the customer for their phone number to look up their account.
Required data to collect:
  - Phone number (phone format, required)
```

## Summary

| File | Change |
|------|--------|
| `src/components/admin/AiChatbotSettings.tsx` | Wrap in AdminPortalLayout for sidebar visibility |
| `src/components/admin/widget/AiFlowBuilder.tsx` | Complete rewrite with node types, drag-and-drop, visual flowchart, fully dynamic fields |
| `supabase/functions/widget-ai-chat/index.ts` | Update prompt builder for new node types (data_collection, escalation, etc.) |

