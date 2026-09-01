# Custom tags across conversations, chats, calls, cases and customers

Add a user-defined tagging system (name + color) that works the same way everywhere brand labels work today, plus filtering by tag in every list.

## What you get

- Create your own tags with a name and a color, managed per organization.
- Apply tags by right-clicking a row in any list (email conversations, live chats, voice calls, cases, customers) and from the detail view of each of those.
- Multiple tags per item; tags show as colored badges in list rows and detail headers.
- A tag filter dropdown (searchable, multi-select) next to the existing filters in each list, including an "Untagged" option.
- Tag management (create, rename, recolor, delete) in Settings, and inline "Create tag" from the tag picker.

## Data model

One shared tag table plus one link table, so a tag can be reused across all entity types.

- `public.tags`: `organization_id`, `name`, `color` (hex), `created_by`, timestamps. Unique on `(organization_id, lower(name))`.
- `public.tag_links`: `tag_id`, `organization_id`, `entity_type` (enum: `conversation`, `call`, `case`, `customer`), `entity_id`, `created_by`, `created_at`. Unique on `(tag_id, entity_type, entity_id)`; indexes on `(entity_type, entity_id)` and `(organization_id, tag_id)`.
- Both tables: GRANTs for `authenticated` and `service_role`, RLS scoped to the user's organization membership (read for members, write for members, delete of a tag definition restricted to admins).
- Live chats are conversations, and email threads are conversations, so both use `entity_type = 'conversation'`.
- Existing `case_tags` / `case_tag_links` stay untouched (unused in the app today); no migration of data needed.

## Frontend

Shared pieces:
- `src/hooks/useTags.ts` — fetch org tags (cached), create/update/delete tag.
- `src/hooks/useEntityTags.ts` — fetch tag links for a set of entity ids, and `addTag` / `removeTag` / `setTags` mutations with cache invalidation and toasts.
- `src/components/tags/TagBadge.tsx` — colored badge (compact variant for rows).
- `src/components/tags/TagPicker.tsx` — searchable multi-select list of tags with checkmarks, color dots, and "Create new tag…" inline.
- `src/components/tags/TagContextMenuItems.tsx` — submenu items reused inside each list's existing right-click menu.
- `src/components/tags/TagFilterSelect.tsx` — multi-select filter dropdown (All / tags / Untagged), mirroring `BrandFilterSelect`.
- `src/components/tags/TagManagerDialog.tsx` — CRUD UI, surfaced from Settings.

Wiring per surface:
- Email conversations: `ConversationTableRow` / `ConversationListItem` badges, tag submenu in `ConversationStatusContextMenu`, picker in the conversation detail header; filter added to `ConversationListHeader` with `tagFilter` state in `ConversationListContext` (included in `clearAllFilters` and `hasActiveFilters`).
- Live chat: badges in `ChatListItem`, tag submenu in the chat row context menu, picker in the chat detail header, filter in `ChatFilters`.
- Voice calls: badges in `CallTableRow` and `EnhancedCallCard`, submenu alongside `CallBrandContextMenu`, picker in `CallDetailsDialog`, filter in the calls list filters.
- Cases: badges in the case list row, context-menu submenu, picker in case detail, filter in the case list filters.
- Customers: badges in `CustomersPage` rows, context-menu submenu, picker in the customer detail panel, filter in the customers page filter bar.

Filtering is applied client-side over the already-loaded lists (same approach as the brand filter), using a map of entity id to tag ids fetched for the visible rows.

## Notes

- Tags are independent of brand labels; brand badges and brand filters stay as they are, and tag badges render next to them.
- Colors come from a fixed palette of design-token-based swatches plus a custom hex input, so badges stay theme-safe.
