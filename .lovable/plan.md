

# Fix Node Reordering for Sequential Chains

## Problem
The move up/down buttons don't work because in the tree structure, sequential nodes are nested parent-to-child (each node is the sole child of the one above). Since there are no siblings, the buttons are always disabled.

For example, the current tree looks like:
```text
Initial Greeting
  children: [
    Ask for Phone Number
      children: [
        Existing Customer?
          children: [
            Present Action Choices
          ]
      ]
  ]
```

Each array has exactly 1 element, so `canMoveUp` (index > 0) and `canMoveDown` (index < length - 1) are always false.

## Solution
Replace the current sibling-only swap logic with chain-aware reordering that swaps a node with its parent (move up) or its first child (move down) in parent-child chains.

### How "Swap with Parent" works (Move Up)
When a node is the only child and user clicks "Move Up":
1. Find the node and its parent in the tree
2. Swap their positions: the child takes the parent's place, and the parent becomes the child
3. Preserve all sub-trees correctly (the moved-up node inherits the parent's position and the parent's other branches stay intact)

Example: Moving "Present Action Choices" up past "Existing Customer?"
- Before: Existing Customer? > children > [Present Action Choices]
- After: Present Action Choices > children > [Existing Customer?]
- The decision's yes/no branches stay attached to it

### How "Swap with Child" works (Move Down)
Inverse of the above: the node swaps with its first/only child.

### Button visibility logic update
- "Move Up" is enabled when the node either has a sibling above OR is a sole child (can swap with parent)
- "Move Down" is enabled when the node either has a sibling below OR is a sole child with children (can swap with child)
- Disabled only at absolute boundaries (root node with no children to swap with, or leaf node)

## Technical Details

### File: `src/components/admin/widget/AiFlowBuilder.tsx`

**New helper: `swapWithParent(nodes, nodeId)`**
- Recursively searches the tree to find the node and its parent
- When found: detaches the node, places it where the parent was, and makes the parent a child of the node
- The swapped node inherits the parent's position in its grandparent's array
- The former parent keeps its own branches (yes_children, no_children, actions) but its `children` array is updated

**New helper: `swapWithChild(nodes, nodeId)`**  
- Finds the node, takes its first child, swaps their positions
- The child moves up to the node's position, the node becomes the child's child

**Updated: `moveNodeInSiblings` renamed to `moveNode`**
- First checks if sibling swap is possible (existing logic)
- If not (sole child), falls back to `swapWithParent` or `swapWithChild` based on direction

**Updated: `FlowNodeRenderer` canMoveUp/canMoveDown logic**
- `canMoveUp`: true if `idx > 0` OR if the node has a parent (is not root-level first node)
- `canMoveDown`: true if `idx < length - 1` OR if the node has children to swap with
- This requires passing additional context (whether node is root-level, whether it has children)

**Updated: `NodeCard` props**
- No changes to the visual buttons, just the enabled/disabled state changes based on the new logic

| File | Change |
|------|--------|
| `src/components/admin/widget/AiFlowBuilder.tsx` | Replace `moveNodeInSiblings` with chain-aware `moveNode` that handles both sibling swaps and parent-child swaps. Update `canMoveUp`/`canMoveDown` logic in `FlowNodeRenderer`. |
