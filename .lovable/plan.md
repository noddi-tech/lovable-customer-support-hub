
Issue confirmed. You are right: the grey area is the conversation table region, not the top app header.

Root cause identified:
- In this app, `bg-background` is currently not pure white at runtime because `DesignSystemProvider` overrides `--background` to `210 20% 98` (light grey).
- `--card` remains pure white (`0 0% 100`).
- Recent changes replaced white/card surfaces with `bg-background`, which unintentionally turned the conversation list area grey.

What I will change after approval (targeted white-only fix for `/interactions/text/...`):

1) Revert conversation-list surfaces from `bg-background` to `bg-card` (white)
- File: `src/components/dashboard/ConversationList.tsx`
  - Change main table wrapper from `bg-background` -> `bg-card`.
- File: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`
  - Change toolbar container from `bg-background` -> `bg-card`.
- File: `src/components/dashboard/conversation-list/BulkActionsBar.tsx`
  - Change bar container from `bg-background` -> `bg-card`.

2) Make table header strips white as well
- File: `src/components/dashboard/conversation-list/ConversationTable.tsx`
  - Sticky `<TableHeader>` currently uses `bg-background`; change to `bg-card`.
- File: `src/components/dashboard/conversation-list/VirtualizedConversationTable.tsx`
  - Fixed header wrapper currently `border-b bg-background`; change to `border-b bg-card`.

3) Fix the surrounding shell where it was switched from white to grey
- File: `src/components/admin/design/components/layouts/MasterDetailShell.tsx`
  - In list mode and detail mode panes, change surface classes from `bg-background` back to `bg-card` where those panes should be white.
  - Keep `gap-0` (that part is correct and avoids background bleed between panes).

4) Keep separators/borders unchanged
- Preserve existing `border-b` / `border-r` lines to maintain structure while making all panel surfaces white.

5) Validation checklist
- Route: `/interactions/text/open?...`
- Confirm:
  - Conversation table area behind toolbar/buttons is white.
  - Column header strip is white.
  - Bulk actions strip is white.
  - No grey bleed between left/center panes.
  - Top app header remains as-is.

Technical note:
- I will use `bg-card` (not `bg-white`) so the fix stays theme-token based while still giving true white in your current design system configuration.
