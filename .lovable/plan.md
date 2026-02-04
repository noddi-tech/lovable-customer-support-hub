

# Add Tag Selection to Pending Review Queue

## Overview

Add multi-select tag functionality to the Knowledge Import pending review screen, allowing reviewers to tag entries with service-related tags (e.g., tire-sales, wheel-change, wheel-storage, tire-repair, rim-repair, car-wash, inside-wash, outside-wash, etc.) before approving them.

## Current State

- The `knowledge_pending_entries` table already has a `suggested_tags` column (ARRAY)
- The `knowledge_entries` table has a `tags` column (ARRAY) for storing tag names
- The `TagMultiSelect` component already exists and supports category-based tag filtering
- The approve mutation does NOT currently save tags to `knowledge_entries`
- No tag UI exists in the pending review queue

## Changes Required

### 1. Add State for Selected Tags

Similar to how we track selected categories per entry, add state to track selected tags:

```typescript
const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({});
```

### 2. Update the PendingEntry Interface

Add `suggested_tags` to the interface:

```typescript
interface PendingEntry {
  // ... existing fields
  suggested_tags: string[] | null;
}
```

### 3. Add TagMultiSelect Component to Review Card

Below the category select, add the tag multi-select:

```
[Quality Stars] [Category Select] [Tags Multi-Select]
```

The TagMultiSelect will:
- Show global tags + tags for the selected category
- Pre-populate with any `suggested_tags` from AI extraction
- Update local state when tags are added/removed

### 4. Update Approve Mutation

Add `tags` parameter to the mutation and include it when inserting:

```typescript
mutationFn: async ({ entryId, categoryId, tags, ... }: { 
  entryId: string; 
  categoryId?: string;
  tags?: string[];
  // ...
}) => {
  // ...
  await supabase.from('knowledge_entries').insert({
    // ... existing fields
    tags: tags && tags.length > 0 ? tags : null,
  });
}
```

### 5. Pass Selected Tags to Mutation

Both the "Approve" and "Save & Approve" buttons need to pass the selected tags.

## UI Layout Change

Current:
```
[Quality Stars] [Category Select ▼]                    [Approve] [Edit] [Skip]
```

Proposed:
```
[Quality Stars] [Category Select ▼] [Tags Multi-Select ▼]     [Approve] [Edit] [Skip]
```

## File Changes

| File | Changes |
|------|---------|
| `src/components/dashboard/knowledge/KnowledgeImportFromHistory.tsx` | Add tag state, update interface, add TagMultiSelect, update mutation |

## Technical Details

### State Management

```typescript
// Initialize with suggested tags from entry
const getInitialTags = (entryId: string, suggestedTags: string[] | null) => {
  return selectedTags[entryId] ?? suggestedTags ?? [];
};
```

### Category-Tag Linking

The TagMultiSelect already supports filtering tags based on selected category via the `selectedCategoryId` prop. When a category is selected, only global tags and tags linked to that category appear.

### Tag Resolution

Categories use IDs but tags in `knowledge_entries` store tag names (not IDs). The TagMultiSelect already works with tag names, so no conversion is needed.

