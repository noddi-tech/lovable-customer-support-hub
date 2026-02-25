

## Make Chat Reply Input Taller

Change the single-line `Input` to a multi-line `Textarea` so agents can see more text while composing messages.

### Change

**File: `src/components/conversations/ChatReplyInput.tsx`**

1. **Replace `Input` import with `Textarea`**: Swap `import { Input }` for `import { Textarea }` from `@/components/ui/textarea`

2. **Update `handleInputChange`**: Change the event type from `React.ChangeEvent<HTMLInputElement>` to `React.ChangeEvent<HTMLTextAreaElement>`

3. **Replace the `<Input>` element (line 428-436) with a `<Textarea>`**:
   - Add `min-h-[80px]` (roughly 3x the default ~28px input height) to make the area taller by default
   - Add `resize-none` to prevent manual resizing (keeps the layout clean)
   - Keep the existing `rounded-full` replaced with `rounded-2xl` (textarea looks odd fully round)
   - Keep all existing props: `placeholder`, `value`, `onChange`, `onKeyDown`, `onBlur`, `disabled`
   - Keep the same styling classes adapted for textarea

4. **Update the outer container**: Change `items-center` to `items-end` on the parent `div` (line 339) so the buttons align to the bottom of the taller textarea instead of vertically centering

