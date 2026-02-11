

# Multi-Branch Flow Architecture

## Problem
Currently only Decision nodes can branch (YES/NO). The user needs any node -- especially Action Menu nodes -- to spawn independent sub-flows per choice. For example, "Present Action Choices" should fan out into separate branches for "Create Order", "View Bookings", "Cancel Booking", etc., each with its own full flow chain. Additionally, branches need a way to loop back (e.g., "Anything else?" redirecting to the action menu or ending the conversation).

## Solution

### 1. Action Menu Branches
Each action item in an Action Menu node gets its own `children` array, turning the action menu into a multi-way fork (not just binary). The `FlowAction` interface gains `children?: FlowNode[]`.

```text
       [Present Action Choices]
        /      |       \       \
  Create    View     Cancel   Wheel
  Order    Bookings  Booking  Storage
    |        |         |        |
  [...]    [...]     [...]    [...]
    |        |         |        |
    +--------+---------+--------+
                 |
         [Anything else?]
              / \
           YES   NO
            |     |
         (goto   [END]
         Action
         Menu)
```

### 2. "Go To" Node Type
Add a new lightweight node type `goto` that references another node by ID. This enables loops like "go back to Action Menu" or "go to End". On the canvas it renders as a small pill with an arrow icon and the target node's label.

### 3. Data Model Changes

**FlowAction** gets children:
```typescript
interface FlowAction {
  id: string;
  label: string;
  enabled: boolean;
  children?: FlowNode[];  // NEW: sub-flow for this action
}
```

**New node type** added to `NodeType`:
```typescript
type NodeType = 'message' | 'decision' | 'action_menu' | 'data_collection' | 'escalation' | 'goto';
```

**FlowNode** for goto type:
```typescript
// When type === 'goto':
interface FlowNode {
  // ...existing fields...
  goto_target?: string;  // ID of the node to jump to
}
```

### 4. Visual Rendering Changes

**Action Menu fork**: When an Action Menu node has actions with children, render a multi-way fork similar to the decision fork but with N columns (one per enabled action). Each column shows the action label and its sub-flow below. A merge connector joins all branches back afterward.

**Goto node**: Renders as a small rounded pill (not a full card) with a curved arrow icon and the label of the target node. Color: teal/cyan accent.

**Multi-column SVG fork**: The fork connector dynamically calculates width based on the number of action branches, spacing columns evenly. Each column is 200px wide with 16px gaps.

### 5. Tree CRUD Updates

The recursive tree helpers (`findNodeInTree`, `updateNodeInTree`, `removeNodeFromTree`, `addChildToTree`) must also traverse `FlowAction.children` arrays inside action_menu nodes. This is an additional recursion path alongside `children`, `yes_children`, and `no_children`.

### 6. Node Editor Updates

**Action Menu editor**: Each action item gets an expandable section showing its branch step count and a note to "click on the canvas to edit branch nodes". The existing toggle + label row stays; below it shows "{N} steps in branch".

**Goto editor**: Shows a dropdown selector listing all nodes in the tree (by label) to pick the jump target.

### 7. Edge Function Update

The `buildNodePrompt` recursive function in `widget-ai-chat/index.ts` must handle:
- Action menu branches: generate "If customer chooses [action label], then: [sub-flow instructions]" blocks
- Goto nodes: generate "Return to the [target node label] step" instruction

## File Changes

| File | Change |
|------|--------|
| `src/components/admin/widget/AiFlowBuilder.tsx` | Add `goto` node type, add `children` to `FlowAction`, multi-way fork rendering for action menus, goto node card, updated tree helpers to traverse action children, goto target selector in editor |
| `supabase/functions/widget-ai-chat/index.ts` | Update `buildNodePrompt` to handle action menu branches and goto references |

### Technical Details

**Multi-way fork SVG**: Dynamically generate fork paths based on action count. Each path curves from center to its column position. Column width = 200px, total SVG width = columns * 200 + gaps.

**Collecting all nodes for goto dropdown**: A helper `collectAllNodes(nodes): {id, label}[]` recursively gathers every node in the tree (including inside action branches) for the goto target selector.

**Action branch add step**: Each action column in the canvas gets its own AddStepButton. Adding a child to an action branch uses a new helper `addChildToAction(nodes, actionMenuNodeId, actionId, newNode)` that finds the action menu node, then the specific action, and appends to its children array.

