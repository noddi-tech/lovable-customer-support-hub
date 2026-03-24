

## Fix: Add "Archived" Badge to Table Row (TableCell Path)

### Problem
The "Archived" badge is present in the **div-based** responsive row (line 245) but **missing** from the **TableCell-based** row (line 360). The user is viewing the table layout, so no archived indicator is visible in the conversation list.

The conversation detail header already shows "Archived" correctly (line 130-132).

### Fix

**File: `src/components/dashboard/conversation-list/ConversationTableRow.tsx`**

Line 360 currently renders only the status badge:
```tsx
<TableCell className="p-2 w-24">{StatusBadge}</TableCell>
```

Change to include the Archived badge (matching the div-based row at line 245):
```tsx
<TableCell className="p-2 w-32">
  <div className="flex items-center gap-1">
    {StatusBadge}
    {conversation.is_archived && (
      <Badge className="px-1.5 py-0 text-[10px] bg-muted text-muted-foreground">
        <Archive className="h-3 w-3 mr-0.5" />
        Archived
      </Badge>
    )}
  </div>
</TableCell>
```

Also widen the Status column header in `ConversationTable.tsx` from `w-24` to `w-32` to accommodate the extra badge.

| File | Change |
|------|--------|
| `ConversationTableRow.tsx` | Add Archived badge next to StatusBadge in TableCell row (line 360) |
| `ConversationTable.tsx` | Widen Status column header from `w-24` to `w-32` |

