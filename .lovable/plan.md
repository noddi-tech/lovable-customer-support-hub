

## Show "Archived" Badge in Conversation Detail View

### Problem
The conversation detail view (both email and chat layouts) has no archived indicator. The list view shows an "Archived" badge, but once you open the conversation, there's no way to tell it's archived.

### Changes

**1. `src/components/dashboard/conversation-view/ConversationViewContent.tsx`**

**Email header** (line ~355, after customer name/email):
- Add an "Archived" badge next to the customer name when `conversation.is_archived` is true

**Chat header** (line ~215, after the online status badge):
- Add the same "Archived" badge when `conversation.is_archived` is true

Both use:
```tsx
{conversation.is_archived && (
  <Badge variant="outline" className="text-xs shrink-0 bg-muted text-muted-foreground">
    <Archive className="h-3 w-3 mr-0.5" />
    Archived
  </Badge>
)}
```

**2. `src/components/dashboard/conversation-view/CustomerSidePanel.tsx`**

In the "CONVERSATION" info section (where Status/Priority/Channel are shown), add an "Archived" row when `conversation.is_archived` is true, so it's also visible in the side panel details.

| File | Change |
|------|--------|
| `ConversationViewContent.tsx` | Add Archived badge in both email and chat headers |
| `CustomerSidePanel.tsx` | Add Archived indicator in conversation details section |

