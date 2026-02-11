

# Tree-Based Branching Flow Architecture

## Problem
Currently, decision nodes store YES/NO outcomes as plain text strings (`if_true: "Verify with PIN"`, `if_false: "Ask what service..."`). There is no way to attach actual sub-flows to branches. The user needs each branch to contain its own chain of nodes -- enabling deeply nested, real conversation trees with potentially 100+ nodes across all branches.

## Solution: Recursive Tree Structure

Replace the flat `nodes[]` array with a recursive tree where each node can have `children` and decision nodes have named branches (`yes_children`, `no_children`), each containing their own sub-flow of nodes.

### New Data Model

```json
{
  "nodes": [
    {
      "id": "node_1",
      "type": "message",
      "label": "Initial Greeting",
      "instruction": "...",
      "children": [
        {
          "id": "node_2",
          "type": "decision",
          "label": "Existing Customer?",
          "instruction": "Check if customer exists",
          "conditions": [{ "id": "c1", "check": "Customer found" }],
          "yes_children": [
            { "id": "node_3", "type": "data_collection", "label": "Verify PIN", "children": [...] }
          ],
          "no_children": [
            { "id": "node_4", "type": "data_collection", "label": "Collect account info", "children": [...] }
          ],
          "children": []
        }
      ]
    }
  ]
}
```

Key changes to `FlowNode`:
- Add `children?: FlowNode[]` -- sequential nodes that follow this one
- Add `yes_children?: FlowNode[]` -- sub-flow for YES branch (decision only)
- Add `no_children?: FlowNode[]` -- sub-flow for NO branch (decision only)
- Keep `conditions` but remove the `if_true`/`if_false` text fields (replaced by actual child node flows)

### Visual Rendering: Recursive Canvas

The flow canvas becomes a recursive renderer:

```text
     [Initial Greeting]
            |
     <Existing Customer?>
        /         \
      YES          NO
       |            |
  [Verify PIN]   [Collect Info]
       |            |
  [Show Bookings] [Ask Service]
       |            |
       +-----+------+
             |
      [Action Menu]
             |
           (END)
```

Each branch renders its own vertical chain of nodes, indented and connected with SVG lines. Branches merge back to the main flow after their sub-chains complete.

### Canvas Component Architecture

1. **`FlowNodeRenderer`** -- A recursive component that renders a single node and its children:
   - Renders the compact node card
   - If decision: renders YES branch column (left) and NO branch column (right) side by side, each calling `FlowNodeRenderer` recursively for their children
   - If not decision: renders `children` sequentially below with connectors
   - Each branch has its own "Add Step" button at the bottom

2. **`FlowCanvas`** -- The top-level container that renders the root-level nodes via `FlowNodeRenderer`

3. **`NodeEditor`** -- Updated to show branch management:
   - For decision nodes: shows the condition check field, and labels for YES/NO branches (the actual branch content is edited by clicking nodes within those branches on the canvas)
   - Removes the old `if_true`/`if_false` textarea fields

### Interaction Model

- Click any node (including branch sub-nodes) to edit it in the right panel
- "Add Step" buttons appear at the end of each branch, allowing you to extend any branch independently
- Each branch can contain any node type, including nested decisions (creating sub-branches)
- Drag-and-drop works within a branch (reorder siblings)
- Delete a node removes it and its children (with confirmation)

### Migration from Flat to Tree

On load, if the existing config has a flat `nodes[]` array without `children`, migrate it:
- Convert sequential nodes into a parent-child chain (node 1's `children` = [node 2], node 2's `children` = [node 3], etc.)
- Decision nodes with `if_true`/`if_false` text get empty `yes_children`/`no_children` arrays (the text is preserved as the condition's description)

## File Changes

| File | Change |
|------|--------|
| `src/components/admin/widget/AiFlowBuilder.tsx` | Complete rewrite: recursive tree data model, recursive `FlowNodeRenderer` for visual branching, updated `NodeEditor` for branch-aware editing, tree-based CRUD helpers, flat-to-tree migration on load |
| `supabase/functions/widget-ai-chat/index.ts` | Update `buildFlowPrompt` to recursively traverse the tree structure, generating indented prompt sections for each branch |

### Technical Details

**Tree CRUD operations:**
- `addChildNode(parentId, branch, type)` -- adds a node as a child of `parentId` in the specified branch ('children', 'yes_children', or 'no_children')
- `removeNodeFromTree(nodeId)` -- recursively finds and removes the node from anywhere in the tree
- `updateNodeInTree(nodeId, updates)` -- recursively finds and updates the node
- All use a recursive tree traversal helper function

**SVG Connectors for branches:**
- Decision fork connector splits into two columns with YES/NO labels
- Each column renders its sub-flow vertically
- A merge connector at the bottom of both columns rejoins the main flow
- Branch columns are rendered side-by-side in a flex container with adequate spacing

**Edge function prompt generation:**
- `buildFlowPrompt` becomes recursive: `buildNodePrompt(node, depth)`
- Each depth level gets indentation in the generated prompt
- Decision branches generate nested IF/THEN/ELSE blocks with their sub-flow instructions

