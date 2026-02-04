

# Fix Category Selection in Pending Review Queue

## Problem

When selecting a category from the dropdown in the Pending Review section, nothing happens. The dropdown closes and reverts to "No category" because:

1. The `onValueChange` handler is empty (just a comment)
2. There is no state to track selected categories per entry
3. The selected category is never passed to the approve mutation

## Root Cause

The current code at line 457-461:

```typescript
<Select
  value={entry.suggested_category_id || 'none'}
  onValueChange={(value) => {
    // Update category in state or directly on approve
  }}
>
```

The `value` is always bound to `entry.suggested_category_id` from the database (which is null), and the `onValueChange` does nothing.

## Solution

Add state to track category selections per entry, update the UI when a category is selected, and pass the selected category when approving.

### Changes Required

| Change | Description |
|--------|-------------|
| Add state | Create `selectedCategories` state object mapping entry ID to category ID |
| Update handler | Implement `onValueChange` to update the state |
| Fix value binding | Use state value if available, fallback to database value |
| Pass to mutation | Include selected category when calling approve mutation |
| Handle "none" value | Convert "none" back to null/undefined for the mutation |

### Implementation Details

#### 1. Add State for Selected Categories

```typescript
const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>({});
```

#### 2. Update the Select Component

```typescript
<Select
  value={selectedCategories[entry.id] ?? entry.suggested_category_id ?? 'none'}
  onValueChange={(value) => {
    setSelectedCategories(prev => ({
      ...prev,
      [entry.id]: value
    }));
  }}
>
```

#### 3. Update Approve Button Handler

When approving, pass the selected category:

```typescript
onClick={() => approveEntryMutation.mutate({
  entryId: entry.id,
  categoryId: selectedCategories[entry.id] !== 'none' 
    ? selectedCategories[entry.id] 
    : undefined,
})}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/knowledge/KnowledgeImportFromHistory.tsx` | Add state, fix Select handler, update approve calls |

## Expected Result

After this fix:
1. Selecting a category will visually update the dropdown to show the selected category
2. The selection persists while reviewing
3. When approving, the selected category is saved to the knowledge entry

