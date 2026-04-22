
## Plan: Restructure `RuleEditor` to let Radix own the close lifecycle

### Goal
Fix the persistent page-freeze after save by decoupling:
- parent-owned editor payload (`state`)
- sheet visibility / close animation (`sheetOpen`)

This keeps the editor data available while the Sheet is animating out, and only clears parent state after the close transition has had time to finish.

### File to update
- `src/components/dashboard/recruitment/admin/rules/RuleEditor.tsx`

### Changes to make

#### 1. Introduce local Sheet visibility state
At the top of `RuleEditor`, replace the derived `open = state !== null` pattern with:

- import `useState`
- add `const [sheetOpen, setSheetOpen] = useState(false);`

#### 2. Open the Sheet when parent state becomes available
Add an effect:

- when `state !== null`, call `setSheetOpen(true)`

This means the parent still decides which rule is being edited, but the Sheet controls when it is visually open/closed.

#### 3. Keep form defaults driven by `state`
Retain the existing `useMemo<RuleFormValues>` based on `state`, including:
- create mode → `NEW_RULE_DEFAULTS`
- edit mode → values from `state.rule`

No change to trigger/action mapping logic.

#### 4. Reset the form when the local Sheet opens
Change the reset effect from `open` to `sheetOpen`:

```ts
useEffect(() => {
  if (sheetOpen) form.reset(defaultValues);
}, [sheetOpen, defaultValues]);
```

This ensures the form refreshes when the editor is opened, without tying the lifecycle to immediate parent unmounting.

#### 5. Replace synchronous parent close with a controlled close handler
Add a single close coordinator:

```ts
const handleOpenChange = (open: boolean) => {
  setSheetOpen(open);
  if (!open) {
    setTimeout(() => onClose(), 150);
  }
};
```

Use this as the `Sheet`’s `onOpenChange`.

Reason:
- Radix gets to close first
- parent `editorState` is cleared only after the close animation window
- avoids the overlay staying mounted and blocking clicks

#### 6. Update save success handlers
In both mutation success callbacks:

- remove `setTimeout(() => onClose(), 0)`
- replace with `setSheetOpen(false)`

So both flows become:

```ts
onSuccess: () => {
  toast.success('Regel opprettet');
  setSheetOpen(false);
}
```

and

```ts
onSuccess: () => {
  toast.success('Regel lagret');
  setSheetOpen(false);
}
```

This makes successful save follow the same close path as any other Sheet dismissal.

#### 7. Update the Sheet props
Replace:

```tsx
<Sheet open={open} onOpenChange={(o) => !o && onClose()}>
```

with:

```tsx
<Sheet open={sheetOpen} onOpenChange={handleOpenChange}>
```

#### 8. Route Cancel through the same close flow
Replace the footer cancel button handler:

```tsx
onClick={onClose}
```

with:

```tsx
onClick={() => setSheetOpen(false)}
```

This is important so cancel uses the exact same Radix-first close lifecycle as save.

#### 9. Leave the rest unchanged
Do not alter:
- trigger/action change handlers
- validation
- layout
- `SheetContent` styling
- controlled `Textarea` pattern
- submit button behavior

### Expected final structure
```text
RuleEditor
 ├─ local state: sheetOpen
 ├─ effect: if parent state exists -> open sheet
 ├─ defaultValues derived from parent state
 ├─ form reset when sheetOpen becomes true
 ├─ handleOpenChange(open)
 │   ├─ setSheetOpen(open)
 │   └─ if closing -> delayed parent onClose after animation window
 ├─ onSubmit
 │   ├─ create success -> toast + setSheetOpen(false)
 │   └─ update success -> toast + setSheetOpen(false)
 └─ <Sheet open={sheetOpen} onOpenChange={handleOpenChange}>
```

### Verification after implementation
Paste back the updated `RuleEditor.tsx` top section through the `return` opening, confirming these exact shape changes:
1. `useState(false)` for `sheetOpen`
2. effect opening the sheet when `state !== null`
3. `handleOpenChange`
4. success handlers calling `setSheetOpen(false)`
5. `Sheet open={sheetOpen} onOpenChange={handleOpenChange}`
6. cancel button calling `setSheetOpen(false)`

### User re-test
1. Edit existing rule → Save → Sheet closes and page remains clickable
2. Create rule → Save → Sheet closes and page remains clickable
3. Click Avbryt → Sheet closes cleanly with no frozen overlay
4. Reopen editor immediately afterward → form still initializes correctly
