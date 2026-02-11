

# Node Reordering in Flow Builder

## Problem
Nodes within the flow tree cannot be moved or reordered. Once placed, a node is stuck in its position. The user needs to rearrange nodes — for example, moving "Present Action Choices" above "Ask for Phone Number" within the same parent branch.

## Solution
Add move up/down buttons on each node card, plus a "Move to" option in the node editor to relocate nodes between branches. This covers both simple reordering (siblings) and cross-branch moves.

### 1. Move Up/Down Buttons on Node Cards
Each node card gets small arrow buttons (top-right corner, visible on hover) to swap position with its sibling above or below within the same parent array. This handles the most common case: reordering steps within a sequence.

### 2. "Move to Branch" in Node Editor
The node editor panel gets a "Move Node" section with a dropdown listing all possible parent locations (root, or any node's children/yes_children/no_children/action children). Selecting a target detaches the node (and its sub-tree) from its current location and appends it to the chosen branch.

### 3. Tree Helper Functions

New helpers needed:

- `moveNodeInArray(nodes, nodeId, direction)` -- swaps a node with its neighbor in a sibling array (up = -1, down = +1). Recursively searches the tree to find which array contains the node, then performs the swap.

- `detachNodeFromTree(nodes, nodeId)` -- removes a node from wherever it sits in the tree and returns both the updated tree and the detached node (preserving its children).

- `collectBranchTargets(nodes)` -- gathers all possible drop targets: `{parentId, branch, label}` tuples for the "Move to" dropdown.

### 4. Visual Design

The move buttons appear as small semi-transparent arrows in the top-right of each NodeCard, visible on hover:

```text
+---------------------------+
| [icon] Node Label   [^][v]|
| Node Type                 |
+---------------------------+
```

- Up arrow disabled if node is first sibling
- Down arrow disabled if node is last sibling
- Buttons are 16x16px, ghost style, muted color

### 5. Node Editor "Move Node" Section

Below the existing fields in the NodeEditor, add a collapsible section:

```text
Move Node
[Select destination branch...  v]
  - Root (top level)
  - Initial Greeting > children
  - Existing Customer? > YES branch
  - Existing Customer? > NO branch
  - Present Action Choices > Book new service
  - Present Action Choices > View my bookings
  ...
[Move]
```

This enables cross-branch moves like moving a node from the YES branch to the NO branch or from one action's sub-flow to another.

## Technical Details

### `moveNodeInSiblings` helper
Recursively traverses the tree. For each array (`children`, `yes_children`, `no_children`, `action.children`), checks if the node is in that array. If found, swaps it with index +/- 1 and returns the updated tree.

### `detachNodeFromTree` helper
Similar to `removeNodeFromTree` but returns the removed node alongside the updated tree, so it can be reattached elsewhere.

### `collectBranchTargets` helper
Walks the entire tree and for each node collects:
- `{parentId: node.id, branch: 'children', label: "NodeLabel > children"}`
- For decisions: also `yes_children` and `no_children`
- For action menus: each action's children as `{parentId: node.id, actionId: action.id, label: "NodeLabel > ActionLabel"}`
- Plus a root entry: `{parentId: null, branch: 'children', label: "Root (top level)"}`

### NodeCard changes
- Add `onMoveUp` and `onMoveDown` optional callbacks
- Show chevron-up and chevron-down buttons on hover (not on goto pill nodes)
- Disabled state when at boundary of sibling list

### FlowNodeRenderer changes
- Pass `onMoveUp(nodeId)` and `onMoveDown(nodeId)` through to each NodeCard
- Track sibling index to determine if up/down should be disabled

### NodeEditor changes
- Add "Move Node" section with dropdown + button
- `onMoveToTarget(nodeId, targetParentId, targetBranch, targetActionId?)` callback

## File Changes

| File | Change |
|------|--------|
| `src/components/admin/widget/AiFlowBuilder.tsx` | Add `moveNodeInSiblings`, `detachNodeFromTree`, `collectBranchTargets` helpers. Update `NodeCard` with move arrows. Update `FlowNodeRenderer` to pass move callbacks. Update `NodeEditor` with "Move Node" section. Wire up move handlers in main `AiFlowBuilder` component. |

