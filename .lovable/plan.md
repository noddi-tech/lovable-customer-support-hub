

# Fix Decision Node: Auto-Evaluate UX + Outcome-Based Branching

## Issues Identified

### 1. Auto badge not visible
The "Auto" badge code exists and works, but only shows after you click a Decision node and manually toggle to "Auto-Evaluate" in the editor. The nodes in your screenshot are still in the default "Ask Customer" mode. This is a discoverability problem -- when you first create a decision that should auto-evaluate, there's no hint that the option exists.

### 2. No way to steer what happens after an outcome
This is the core problem. Right now the auto-evaluate mode just tells the AI to "figure it out from context." But you need **explicit links** between a previous step's result and the decision's branching. For example: "If Phone Verification succeeded (PIN verified) -> YES branch, else -> NO branch."

### 3. Fields disappeared
Looking at your saved flow data, the fields ARE still saved in the database. However, the old default flow nodes (Ask for Phone Number, Existing Customer?) are stuck at the bottom of the canvas because they're nested inside the action menu's `children` array alongside your new nodes. This makes the flow look broken. This is a data issue from the initial default flow structure -- those orphan nodes need to be removed manually by clicking them and deleting.

---

## Plan

### Change 1: Add "Evaluate Based On" selector to auto-evaluate decisions

When a Decision node is set to "Auto-Evaluate", show a new dropdown: **"Evaluate based on"** that lists all Data Collection fields from nodes that come BEFORE the decision in the tree. This creates an explicit link.

**File: `src/components/admin/widget/AiFlowBuilder.tsx`**

- Add `auto_evaluate_source?: string` to `FlowNode` interface (stores the field type or node ID to reference)
- Add a helper `collectPriorDataFields(nodes, targetNodeId)` that walks the tree and returns all data fields from nodes that appear before the decision
- In the Decision editor section (after the mode toggle, around line 1024), when `auto_evaluate` is selected, render:
  - A Select dropdown listing prior data collection fields (e.g., "Phone + PIN Verification from 'Ask for Phone Number'", "Address from 'Collect Address'")
  - Hint text explaining: "The AI will check the result of this field and branch YES (success) or NO (failure)"

UI in the editor when auto-evaluate is selected:

```text
Decision Mode
  [Ask Customer]  [Auto-Evaluate*]

  Evaluate based on:
  [ Phone + PIN Verification (Ask for Phone Number) v ]

  The AI will check the outcome of this field.
  YES branch = success/verified | NO branch = failure/not found
```

### Change 2: Update prompt generation for explicit outcome references

**File: `supabase/functions/widget-ai-chat/index.ts`**

Update the auto-evaluate prompt section (around line 476) to include the specific source reference:

Current:
```
- Evaluate: {condition}
  Based on the information you already have...
```

New (when source is specified):
```
- Evaluate: {condition}
  Check the result/outcome of the "{source_label}" step.
  If that step was successful/verified/positive -> follow the TRUE branch.
  If that step failed/was not verified/negative -> follow the FALSE branch.
  Do NOT ask the customer. Decide automatically and silently continue.
```

### Change 3: Improve auto badge visibility on canvas

**File: `src/components/admin/widget/AiFlowBuilder.tsx`**

The badge already exists at line 668 but is small. Make it more prominent:
- Move it above the YES/NO row instead of inline
- Use a slightly larger font and distinct icon (brain/zap icon)

### Change 4: Add `auto_evaluate_source` to edge function types

**File: `supabase/functions/widget-ai-chat/index.ts`**

Add `auto_evaluate_source?: string` to the `FlowNode` interface in the edge function so the prompt builder can reference it.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/admin/widget/AiFlowBuilder.tsx` | Add `auto_evaluate_source` to FlowNode, add prior-fields collector helper, add "Evaluate based on" dropdown in decision editor, improve auto badge styling |
| `supabase/functions/widget-ai-chat/index.ts` | Add `auto_evaluate_source` to FlowNode, update prompt generation to reference specific source field/step |

## Result

After this change, the flow you're building will work like:

1. **Data Collection: Ask for Phone** (collects phone, triggers PIN verification)
2. **Decision: Customer verified?** -- set to Auto-Evaluate, source = "Phone + PIN Verification"
   - The AI automatically checks if the PIN was verified
   - YES -> proceed to address step
   - NO -> go to retry/create account step
3. **Data Collection: Address Search** (collects address, checks delivery area)
4. **Decision: Do we deliver?** -- set to Auto-Evaluate, source = "Address Search"
   - The AI automatically checks `is_in_delivery_area`
   - YES -> proceed to booking
   - NO -> show alternative options

