

## Fix Conversation & Timeline Sections in Customer Side Panel

### Problem
1. **Conversation section** uses `text-sm` instead of the compact `text-xs` density standard
2. **Timeline section** uses `text-sm` and shows empty dates because the `useConversationMeta` hook returns `lastUpdated` (not `updated_at`) and doesn't fetch `created_at` at all
3. Icons in both sections use `h-4 w-4` instead of `h-3 w-3`

### Changes

#### 1. Add `created_at` to conversation meta hook

**File: `src/hooks/conversations/useConversationMeta.ts`**

- Add `created_at` to the Supabase select query
- Add `createdAt: string` to the `ConversationMeta` interface
- Map `conversation.created_at` to `createdAt` in the return object

#### 2. Fix Timeline to use correct field names and compact sizing

**File: `src/components/dashboard/conversation-view/CustomerSidePanel.tsx`** (lines 848-930)

| Current | New |
|---------|-----|
| `conversation.created_at` | `conversation.createdAt` |
| `conversation.updated_at` | `conversation.lastUpdated` |
| `text-sm` on labels | `text-xs` |
| Icons `h-4 w-4` | `h-3 w-3` |

Also fix the Conversation section (lines 866-901):
- Change all `text-sm` to `text-xs` on the status/priority/channel rows
- Change Email/Phone section icons from `h-4 w-4` to `h-3 w-3` and text from `text-sm` to `text-xs`

### Summary

| File | Change |
|------|--------|
| `src/hooks/conversations/useConversationMeta.ts` | Add `created_at` to query and expose as `createdAt` |
| `src/components/dashboard/conversation-view/CustomerSidePanel.tsx` | Fix field name references (`createdAt`, `lastUpdated`), compact all text to `text-xs`, icons to `h-3 w-3` |

