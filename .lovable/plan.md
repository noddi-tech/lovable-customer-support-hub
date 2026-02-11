

# Fix Component Creator: Database Persistence, UI Visibility, and Shadcn Component Selection

## Problems

1. **"Database persistence coming soon"** -- the Save button only shows a toast and does nothing. Created components vanish immediately because they are never written to the `widget_block_configs` table or loaded back.
2. **No way to choose a UI component** -- user wants to pick from available shadcn components (Calendar, Input, Select, etc.) as the rendering element for custom blocks.

## Solution

### 1. Persist to Supabase on Save

Replace the placeholder `handleSave` with a real Supabase insert into `widget_block_configs`:

```text
handleSave:
  1. Get currentOrganizationId from organizationStore
  2. Insert into widget_block_configs with all form fields
  3. Invalidate a react-query cache key so the list refreshes
  4. Close dialog and reset form
```

### 2. Load Custom Blocks and Display Them

Add a `useQuery` hook in the main `ComponentLibrary` component to fetch rows from `widget_block_configs` for the current organization. Merge them with the code-defined `getAllBlocks()` results so they appear in both the Library grid and the Manage table.

Custom blocks will render with a "Custom" badge to distinguish them from built-in registry blocks. They will also have a Delete button in the Manage view.

### 3. Add Shadcn Component Selector (Step 1 of Creator)

Add a new "UI Component" dropdown in Step 1 of the Create dialog. Options:

| Value | Label | Description |
|-------|-------|-------------|
| `text_input` | Text Input | Standard text field |
| `email_input` | Email Input | Email-formatted input |
| `calendar` | Calendar / Date Picker | Date selection with calendar popup |
| `select` | Dropdown Select | Single-choice dropdown |
| `checkbox` | Checkbox | Toggle yes/no |
| `radio` | Radio Group | Multiple choice, single selection |
| `slider` | Slider | Numeric range |
| `textarea` | Text Area | Multi-line text input |
| `custom` | Custom (code only) | Placeholder for code-defined blocks |

This value is stored in a new `ui_component` field on the form and saved to the database (added to the `widget_block_configs` table as a column, or stored inside `api_endpoints` JSON -- using the simpler approach of adding it as a column).

### 4. Preview Custom Blocks in Library

For custom blocks loaded from the database, the Library card will render a live preview of the selected shadcn component (e.g., show an actual `Calendar` component for date picker blocks, an `Input` for text input blocks).

## File Changes

| File | Change |
|------|--------|
| `src/components/admin/widget/ComponentLibrary.tsx` | Wire up real Supabase save, add useQuery to load custom blocks, add UI component selector dropdown, render custom block previews, add delete functionality |
| `supabase/migrations/[timestamp].sql` | Add `ui_component TEXT DEFAULT 'custom'` column to `widget_block_configs` |

## Technical Details

### Supabase Insert (in handleSave)

```typescript
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';

const handleSave = async () => {
  const { currentOrganizationId } = useOrganizationStore.getState();
  const { error } = await supabase.from('widget_block_configs').insert({
    organization_id: currentOrganizationId,
    type_key: typeKey,
    label: form.name,
    icon: form.icon,
    description: form.description,
    marker: `[${typeKey.toUpperCase()}]`,
    closing_marker: `[/${typeKey.toUpperCase()}]`,
    field_type: form.fieldType,
    requires_api: form.requiresApi,
    ui_component: form.uiComponent,
    api_endpoints: form.requiresApi ? form.endpoints.map(...) : [],
  });
  // Handle error or success, invalidate query, close dialog
};
```

### Loading Custom Blocks

```typescript
const { data: customBlocks } = useQuery({
  queryKey: ['widget-block-configs', currentOrganizationId],
  queryFn: () => supabase
    .from('widget_block_configs')
    .select('*')
    .eq('organization_id', currentOrganizationId),
  enabled: !!currentOrganizationId,
});
```

### UI Component Selector

A new `Select` dropdown in Step 1, between "Field Type" and "Requires API":

```text
UI Component: [Calendar v]
  - Text Input
  - Email Input
  - Calendar / Date Picker
  - Dropdown Select
  - Checkbox
  - Radio Group
  - Slider
  - Text Area
  - Custom (code only)
```

### Custom Block Card Preview

Maps the `ui_component` value to a real shadcn component rendered in the Library card sandbox:

```typescript
function renderCustomBlockPreview(uiComponent: string) {
  switch (uiComponent) {
    case 'calendar': return <Calendar mode="single" className="rounded-md border" />;
    case 'text_input': return <Input placeholder="Sample text..." />;
    case 'select': return <Select>...</Select>;
    case 'checkbox': return <Checkbox />;
    // etc.
  }
}
```

