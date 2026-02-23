
Goal: make the conversation-list toolbar controls visibly smaller and tighter (left action buttons + right Filters/Sort), without unintentionally shrinking buttons across the rest of the app.

What I found in the current code:
- Toolbar action buttons use `<Button size="sm">` in `ConversationListHeader.tsx`.
- Global `sm` button size is already `h-7 px-2.5` in `src/components/ui/button.tsx`.
- Filters trigger is a custom `<button>` at `h-7 px-2.5 text-xs`.
- Sort trigger is `<SelectTrigger className="... h-7 ... px-2.5 text-xs ...">`.
- So everything in this toolbar is currently “small”, but still not compact enough visually.

Implementation approach (targeted, low-risk):
1) Add an extra-compact button size variant (`xs`) in the shared Button component
- File: `src/components/ui/button.tsx`
- Add a new size variant:
  - `xs: "h-6 px-2 text-[11px]"`
- Keep existing `sm` unchanged, so the rest of the app is not affected.

2) Apply compact size only in the conversation-list toolbar
- File: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`
- Change toolbar action buttons from `size="sm"` to `size="xs"`:
  - Select
  - New
  - Merge
  - Migrate
  - Mark Read
- Slightly tighten icon sizing for this toolbar where needed (e.g. from 3.5 to 3) only if visual pass still looks heavy.

3) Make Filters + Sort controls match the same compact height and density
- File: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`
- Filters trigger:
  - `h-7 -> h-6`
  - `px-2.5 -> px-2`
  - `gap-1 -> gap-0.5`
  - keep text at `text-[11px]`/`text-xs` equivalent for consistency
- Sort trigger:
  - `h-7 -> h-6`
  - `px-2.5 -> px-2`
  - tighten horizontal gap (`gap-1 -> gap-0.5`)
  - keep readable but compact label sizing

4) Tighten toolbar container spacing so controls feel less “clumpy”
- File: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`
- Reduce outer/internal spacing slightly:
  - top bar wrapper padding (`p-2 md:p-3`) to a tighter value
  - row gaps (`gap-2`, right group `gap-1.5`) reduced one step
- This improves compactness without harming clickability.

Why this approach:
- It directly addresses your complaint in the exact area you highlighted.
- It avoids globally shrinking every `sm` button in the entire app again.
- It gives a reusable `xs` button size for future compact toolbars.

Files to update:
- `src/components/ui/button.tsx`
- `src/components/dashboard/conversation-list/ConversationListHeader.tsx`

Validation checklist after implementation:
- Left action group appears tighter (shorter height, less horizontal bulk).
- Filters and Sort are the same compact visual size as the action buttons.
- Toolbar still aligns cleanly on desktop and remains usable on smaller widths.
- No unintended size regressions in other app sections that still rely on `size="sm"`.
