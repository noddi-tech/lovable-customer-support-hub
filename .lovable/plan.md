

# Visual Flowchart Diagram Redesign

## Problem
The current "Flow" tab is a simple vertical list of editable form cards with tiny chevron separators. It does not look or feel like a flowchart diagram. The user wants a proper visual flowchart like the Master of Code reference -- compact diagram nodes connected by lines, with decision branches splitting into YES/NO paths.

## Design Approach

Replace the current form-card layout with a true **flowchart diagram** rendered on a scrollable canvas. Each node becomes a compact, colored shape (not a full form card). Clicking a node opens an edit panel/drawer on the side.

### Visual Layout

```text
    +---------------------------+
    |  Initial Greeting         |  (blue, message)
    +---------------------------+
                |
                v
    +---------------------------+
    |  Ask for Phone Number     |  (purple, data collection)
    +---------------------------+
                |
                v
        +-----------------+
       /  Existing         \
      / Customer?           \     (amber diamond, decision)
      \                    /
       \                  /
        +--------+-------+
         |               |
      YES |           NO |
         v               v
  +-----------+   +-----------+
  | Verify    |   | Ask what  |
  | with PIN  |   | service   |
  +-----------+   +-----------+
         |               |
         +-------+-------+
                 |
                 v
    +---------------------------+
    |  Present Action Choices   |  (green, action menu)
    +---------------------------+
```

### Two-Panel Layout

The flow tab will use a split layout:
- **Left: Flowchart canvas** -- a scrollable, zoomable diagram area showing compact nodes with connecting SVG lines
- **Right: Node editor panel** -- when a node is selected, its full editing form appears here (instruction, conditions, data fields, etc.)

This keeps the diagram clean and uncluttered while still allowing detailed editing.

### Node Shapes by Type
- **Message**: Rounded rectangle with blue left accent
- **Decision**: Diamond-shaped or hexagonal with amber accent, YES/NO branches going left and right (or down-left / down-right)
- **Action Menu**: Rounded rectangle with green accent, shows list items as small pills inside
- **Data Collection**: Rounded rectangle with purple accent, shows field names as tags
- **Escalation**: Rounded rectangle with red accent and warning icon

### Connecting Lines
- SVG-based lines drawn between nodes
- Straight vertical lines for sequential flow
- Forked lines for decision branches (YES goes left, NO goes right)
- Lines have small arrow heads at the end
- Decision branch labels ("YES" / "NO") rendered along the lines

### Interactions
- **Click node** to select it and open the editor panel on the right
- **Drag nodes** to reorder in the flow sequence
- **"Add Step" button** appears between nodes on hover (or at the bottom) with the type selector dropdown
- **Delete node** via the editor panel or a small X on hover
- **Zoom/scroll** the canvas for large flows

## File Changes

### `src/components/admin/widget/AiFlowBuilder.tsx` -- Complete Rewrite

The component will be restructured into:

1. **FlowCanvas** -- The left panel rendering the visual diagram
   - Each node rendered as a compact card (120-200px wide) with icon, label, and type badge
   - Decision nodes show forked connectors with YES/NO labels
   - SVG lines connecting nodes vertically (and horizontally for branches)
   - Click handler to select a node
   - "Add step" insertion points between nodes

2. **NodeEditor** -- The right panel (slides in when a node is selected)
   - Full editing form for the selected node (reuses existing form logic: instruction textarea, conditions, actions, data fields)
   - Node type selector dropdown
   - Delete button
   - Close button to deselect

3. **FlowChart layout** -- Flex container with canvas (flex-1) and editor panel (w-[380px], conditional)

### Key Technical Details

- **SVG Connectors**: Use an SVG overlay positioned absolutely over the node container. Calculate node positions from DOM refs and draw paths between them.
- **Decision Branching**: For decision nodes, render YES/NO child summaries as smaller connected nodes below-left and below-right, with curved SVG paths and labels.
- **No new dependencies**: Uses existing React, SVG, and CSS. No external flowchart library needed -- keeps it lightweight and fully customizable.
- **Responsive**: On smaller screens, the editor panel opens as a sheet/drawer overlay instead of side-by-side.

### General Rules
The "General Rules" section moves to a collapsible panel at the top of the editor sidebar (always accessible, not tied to a specific node).

## Summary

| File | Change |
|------|--------|
| `src/components/admin/widget/AiFlowBuilder.tsx` | Complete rewrite: two-panel layout with visual flowchart canvas (SVG connectors, compact diagram nodes, decision branching) and a slide-in node editor panel |

No database, edge function, or routing changes needed -- only the visual presentation of the flow builder changes.
