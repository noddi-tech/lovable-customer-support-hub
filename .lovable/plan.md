

# Add Emoji Picker to Component Creator Icon Field

## What Changes

Replace the plain text input for the "Icon" field in the Create Component dialog (Step 1) with the existing `EmojiPicker` component. Instead of typing an emoji manually, clicking the icon button opens the full emoji picker popover with search and categories.

## Technical Details

### File: `src/components/admin/widget/ComponentLibrary.tsx`

**1. Add import:**
```typescript
import { EmojiPicker } from '@/components/ui/emoji-picker';
```

**2. Replace the icon input (around line 424-427):**

Current code:
```typescript
<Label className="text-xs">Icon</Label>
<Input value={form.icon} onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))} className="text-center text-lg" maxLength={2} />
```

Replace with an `EmojiPicker` using the icon button as its trigger:
```typescript
<Label className="text-xs">Icon</Label>
<EmojiPicker
  onEmojiSelect={(emoji) => setForm(f => ({ ...f, icon: emoji }))}
  trigger={
    <Button variant="outline" className="h-10 w-10 text-xl p-0">
      {form.icon}
    </Button>
  }
/>
```

This reuses the project's existing `EmojiPicker` component (which already has search, categories, and shortcode support) -- no new components needed.

