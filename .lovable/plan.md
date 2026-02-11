

# Component Library Tab in AI Chatbot Flow Builder

## Overview

Add a **"Components" tab** (with a puzzle-piece icon) to the existing 5-tab layout in the AI Chatbot settings page. This tab will have two sub-views:

1. **Library** -- Browse all registered interactive blocks with live previews and sample interaction testing
2. **Manage** -- View component details, see their registry metadata, understand what each component does and how it connects to the flow

The tab reads everything dynamically from the block registry -- zero hardcoded component lists.

## UI Design

### Tab Bar Change

The current 5 tabs (Flow, Test, Conversations, Analytics, Gaps) become 6 tabs:

```text
[Components]  [Flow]  [Test]  [Conversations]  [Analytics]  [Gaps]
     |
     +-- Sub-tabs: [Library]  [Manage]
```

Components tab goes first since it's the starting point for understanding available blocks.

### Library Sub-View

A grid of cards, one per registered block. Each card shows:
- Icon + Label (from `flowMeta`)
- Description text
- "Requires API" badge (if `requiresApi: true`)
- Applicable field types / node types as tags
- **Live Preview**: The actual `previewComponent` rendered
- **Try It** button: Expands the card to show an interactive sandbox where the real widget component renders with mock props (dummy `onAction`, dummy `usedBlocks`, sample `data`)

### Manage Sub-View

A table/list of all registered blocks with columns:
- Icon + Name
- Type (marker syntax, e.g. `[YES_NO]...[/YES_NO]`)
- Requires API (yes/no)
- Applicable Field Types
- Applicable Node Types
- Has Preview (yes/no)

This gives admins a full inventory view. Each row is expandable to show the full description, marker syntax, and preview.

## Technical Implementation

### File 1: `src/components/admin/widget/ComponentLibrary.tsx` (NEW)

A new component with two sub-tabs (Library / Manage):

```typescript
import { getAllBlocks, BlockDefinition } from '@/widget/components/blocks';

const ComponentLibrary: React.FC = () => {
  const blocks = getAllBlocks(); // Dynamic from registry
  const [subTab, setSubTab] = useState<'library' | 'manage'>('library');
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

  // Library: grid of cards with previews and interactive sandbox
  // Manage: table view with metadata
};
```

**Library card interactive sandbox**: When "Try It" is clicked, renders the actual block component with mock props:

```typescript
<block.component
  primaryColor="#7c3aed"
  messageId="preview-sandbox"
  blockIndex={0}
  usedBlocks={new Set()}       // Empty = interactive
  onAction={(val, key) => {
    toast.info(`Action: "${val}" (key: ${key})`);
  }}
  data={getSampleData(block.type)}  // Pre-defined sample data per type
/>
```

`getSampleData` returns appropriate mock data:
- `action_menu`: `{ options: ['Option A', 'Option B', 'Option C'] }`
- `yes_no`: `{ question: 'Was this helpful?' }`
- `confirm`: `{ summary: 'Cancel your booking for March 15?' }`
- `text_input`: `{ placeholder: 'Enter your name...' }`
- Others: `{}`

### File 2: `src/components/admin/AiChatbotSettings.tsx` (MODIFIED)

- Import `ComponentLibrary`
- Add `Puzzle` icon from lucide-react
- Change `grid-cols-5` to `grid-cols-6` in TabsList
- Add new `TabsTrigger` for "Components" and corresponding `TabsContent`
- The Components tab does NOT need `widgetId` -- it shows the global component registry

### File 3: `src/components/admin/widget/index.ts` (MODIFIED)

Add export for `ComponentLibrary`.

## File Changes Summary

| File | Change |
|------|--------|
| `src/components/admin/widget/ComponentLibrary.tsx` | **New**: Component Library with Library (card grid + interactive sandbox) and Manage (table view) sub-tabs |
| `src/components/admin/AiChatbotSettings.tsx` | **Modified**: Add 6th "Components" tab with Puzzle icon |
| `src/components/admin/widget/index.ts` | **Modified**: Export ComponentLibrary |

