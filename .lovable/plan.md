

# Component Registry Architecture for Flow Builder

## Problem

The Flow Builder has three critical issues:

1. **Hardcoded previews**: Changing a field type dropdown from "Phone" to "Text" still shows "Phone + PIN Verification" because the preview logic checks `field.label.toLowerCase().includes('phone')` regardless of the selected `field_type`. The preview doesn't react to the dropdown.

2. **No component library**: Admins have to know what each field type does by guessing. There's no visual catalog of available interactive components they can browse and understand before adding them.

3. **Not scalable**: Adding a new component requires editing 4+ files with hardcoded if/else blocks. The inline block components in AiChat.tsx (1131 lines) are monolithic.

## Solution

### A. Component Registry (`src/widget/components/blocks/registry.ts`)

A single source of truth that defines every interactive component with:

- **Marker parsing rules** (tag, closing tag, content parser)
- **React component** reference for the widget
- **Flow Builder metadata** (label, icon, description, mini-preview)
- **Prompt instruction** for the LLM
- **API flag** for components needing backend calls

```text
registry.ts
  |
  +-- defines BlockDefinition interface
  +-- exports registerBlock(), getBlock(), getAllBlocks()
  +-- exports getBlockForFieldType(), getBlockForNodeType()
```

### B. Extract Each Block into Its Own File

Move all inline components from AiChat.tsx into individual files:

```text
src/widget/components/blocks/
  registry.ts
  ActionMenuBlock.tsx    (existing, extracted)
  PhoneVerifyBlock.tsx   (existing, extracted + self-registers)
  YesNoBlock.tsx         (existing, extracted)
  EmailInputBlock.tsx    (existing, extracted)
  TextInputBlock.tsx     (existing, extracted)
  RatingBlock.tsx        (existing, extracted)
  ConfirmBlock.tsx       (existing, extracted)
  index.ts              (imports all blocks to trigger registration)
```

Each file exports the component AND calls `registerBlock()` with its metadata. This makes adding a new component a single-file operation.

### C. Dynamic Parser (parseMessageBlocks.ts)

Instead of a hardcoded MARKERS array, the parser builds its marker list from the registry:

```typescript
import { getAllBlocks } from '../components/blocks/registry';

const MARKERS = getAllBlocks().map(def => ({
  tag: def.marker,
  hasClosing: !!def.closingMarker,
  closingTag: def.closingMarker,
  parse: (inner) => ({ type: def.type, ...def.parseContent(inner) }),
}));
```

### D. Simplified AiChat.tsx Renderer

Replace the ~200-line if/else `MessageBlockRenderer` with a registry-driven loop:

```typescript
const def = getBlock(block.type);
if (!def) return null;
return <def.component {...standardProps} data={block} />;
```

This drops AiChat.tsx from ~1131 lines to ~600 lines.

### E. Registry-Driven Flow Builder Previews

The NodeCard badges and NodeEditor "Customer Sees" section will use registry metadata instead of hardcoded checks:

**NodeCard** (data_collection nodes):
```typescript
const blockDef = getBlockForFieldType(field.field_type);
// Renders: blockDef.flowMeta.icon + blockDef.flowMeta.label
```

**NodeEditor** (data_collection fields):
```typescript
const blockDef = getBlockForFieldType(field.field_type);
// Shows: blockDef.flowMeta.description (info banner)
// Shows: blockDef.flowMeta.previewComponent (mini mockup)
```

This means changing the dropdown from "Phone" to "Text" instantly swaps the preview, badge, and description. No hardcoded if/else.

### F. Edge Function Prompt Map

A `BLOCK_PROMPTS` lookup in the edge function replaces hardcoded if/else in `buildNodePrompt`:

```typescript
const BLOCK_PROMPTS = {
  phone_verify: { fieldTypes: ['phone'], instruction: () => 'Include [PHONE_VERIFY]...' },
  email_input:  { fieldTypes: ['email'], instruction: () => 'Include [EMAIL_INPUT]...' },
  text_input:   { fieldTypes: ['text'],  instruction: ({ label }) => `Include [TEXT_INPUT]${label}[/TEXT_INPUT]...` },
  yes_no:       { nodeTypes: ['decision'], instruction: ({ check }) => `Include [YES_NO]${check}[/YES_NO]...` },
};
```

## BlockDefinition Interface

```typescript
interface BlockDefinition {
  type: string;                    // 'phone_verify', 'yes_no', etc.
  marker: string;                  // '[PHONE_VERIFY]'
  closingMarker?: string;          // '[/YES_NO]' or undefined for self-closing
  parseContent: (inner: string) => Record<string, any>;

  component: React.FC<BlockComponentProps>;
  requiresApi?: boolean;

  flowMeta: {
    label: string;                 // "Phone + PIN Verification"
    description: string;           // Info banner text
    applicableFieldTypes?: string[];  // ['phone']
    applicableNodeTypes?: string[];   // ['decision']
    previewComponent?: React.FC;      // Mini mockup for NodeEditor
  };

  promptInstruction: (ctx: any) => string;
}
```

## How Adding a New Component Works (After This Refactor)

1. Create `src/widget/components/blocks/DatePickerBlock.tsx`
2. Write the React component
3. Call `registerBlock({ type: 'date_picker', marker: '[DATE_PICKER]', flowMeta: { applicableFieldTypes: ['date'], ... }, ... })`
4. Add one entry to `BLOCK_PROMPTS` in the edge function
5. Done -- parser, widget renderer, flow builder previews, and prompt generation all work automatically

## File Changes Summary

| File | Change |
|------|--------|
| `src/widget/components/blocks/registry.ts` | New: BlockDefinition interface, registration functions, shared BlockComponentProps type |
| `src/widget/components/blocks/ActionMenuBlock.tsx` | New: Extracted from AiChat.tsx, self-registers |
| `src/widget/components/blocks/PhoneVerifyBlock.tsx` | New: Extracted from AiChat.tsx, self-registers with flowMeta including mini phone preview |
| `src/widget/components/blocks/YesNoBlock.tsx` | New: Extracted, self-registers with flowMeta for decision nodes |
| `src/widget/components/blocks/EmailInputBlock.tsx` | New: Extracted, self-registers for email field type |
| `src/widget/components/blocks/TextInputBlock.tsx` | New: Extracted, self-registers for text field type |
| `src/widget/components/blocks/RatingBlock.tsx` | New: Extracted, self-registers |
| `src/widget/components/blocks/ConfirmBlock.tsx` | New: Extracted, self-registers |
| `src/widget/components/blocks/index.ts` | New: Imports all block files to trigger registration |
| `src/widget/components/AiChat.tsx` | Refactored: Remove ~500 lines of inline components, use registry-based MessageBlockRenderer |
| `src/widget/utils/parseMessageBlocks.ts` | Refactored: Build MARKERS dynamically from registry |
| `src/components/admin/widget/AiFlowBuilder.tsx` | Refactored: Replace hardcoded NodeCard badges and NodeEditor previews with registry lookups |
| `supabase/functions/widget-ai-chat/index.ts` | Refactored: Use BLOCK_PROMPTS map in buildNodePrompt instead of hardcoded if/else |

