

# Add Auto-Evaluate Decision Mode

## Problem

Currently, every Decision node in the flow builder always presents YES/NO buttons to the customer. But many decisions should be evaluated **automatically by the AI** based on the outcome of a previous step -- for example:

- "Was the phone PIN verified?" -- the AI already knows this from the previous step's result
- "Is the address in our delivery area?" -- the address block already returned `is_in_delivery_area`
- "Is the customer existing?" -- the AI can check this from its tool results

These are not questions for the customer -- they are logic gates the AI should resolve on its own.

## Solution

Add a **Decision Mode** toggle to the Decision node: **"Ask Customer"** vs **"Auto-Evaluate"**.

- **Ask Customer** (current behavior): Shows YES/NO buttons to the customer
- **Auto-Evaluate** (new): The AI checks the condition itself based on prior context/results, and silently follows the YES or NO branch without showing buttons

## Changes

### 1. FlowNode type -- add `decision_mode` field

In `AiFlowBuilder.tsx`, add an optional `decision_mode` property to the `FlowNode` interface:

```typescript
interface FlowNode {
  // ... existing fields
  decision_mode?: 'ask_customer' | 'auto_evaluate';  // default: 'ask_customer'
}
```

### 2. Decision Node Editor -- add mode selector

In the Decision section of the Node Editor sidebar (around line 988), add a toggle/select above the Conditions section:

```text
Decision Mode
  [Ask Customer]  [Auto-Evaluate]

  Ask Customer: Show YES/NO buttons to the customer
  Auto-Evaluate: AI decides based on previous step results
```

This will be a simple two-button toggle group. When "Auto-Evaluate" is selected, the preview at the bottom changes from showing YES/NO buttons to showing an info box like:

> "The AI will automatically evaluate this condition based on prior conversation context and take the appropriate branch."

### 3. Node Card visual indicator

On the canvas, auto-evaluate Decision nodes will show a small "auto" badge or a different icon hint so they're visually distinguishable from customer-facing decisions.

### 4. Prompt generation -- handle auto-evaluate mode

In `supabase/functions/widget-ai-chat/index.ts`, update the `buildNodePrompt` function (around line 472):

**Current** (always shows YES/NO buttons):
```
- IF {condition}:
  Present this as a YES/NO choice using [YES_NO]...[/YES_NO]
```

**New** (mode-aware):
```
// ask_customer mode (default, unchanged):
- IF {condition}:
  Present this as a YES/NO choice using [YES_NO]...[/YES_NO]

// auto_evaluate mode:
- Evaluate: {condition}
  Based on the information you already have from previous steps, determine if this is true or false.
  Do NOT ask the customer. Silently follow the appropriate branch.
  → If TRUE: ...
  → If FALSE: ...
```

### 5. Edge function types -- add `decision_mode` to FlowNode interface

Update the `FlowNode` interface in the edge function to include the new field.

## Files Changed

| File | Change |
|------|--------|
| `src/components/admin/widget/AiFlowBuilder.tsx` | Add `decision_mode` to `FlowNode` interface. Add mode toggle UI in the Decision editor section. Update node card to show auto-evaluate indicator. |
| `supabase/functions/widget-ai-chat/index.ts` | Add `decision_mode` to `FlowNode` interface. Update `buildNodePrompt` to generate different prompt text based on mode. |

## User Experience

When building a flow like the one in your screenshots:

1. **"Customer verified with pin?"** -- set to **Auto-Evaluate** mode. The AI checks whether the phone verification block succeeded and automatically goes to the address step (YES) or the retry step (NO). No buttons shown to customer.

2. **"Do we deliver?"** -- set to **Auto-Evaluate** mode. The AI checks the `is_in_delivery_area` result from the address block and branches automatically.

3. **"Verify again or create account"** -- set to **Ask Customer** mode. This is a genuine question where the customer needs to choose.

