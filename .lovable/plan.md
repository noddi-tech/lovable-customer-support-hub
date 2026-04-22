
Apply the Radix `DropdownMenu` handoff fix in `src/components/dashboard/recruitment/admin/rules/RuleCard.tsx` by deferring overlay-opening actions to the next animation frame.

### Scope
Only update the two `DropdownMenuItem` handlers that can open overlays:
- `Rediger`
- `Slett`

Do not change:
- `Dupliser`
- delete dialog ownership in `RulesTab`
- mutation logic
- toggle, drag/drop, styling, copy, or any other behavior

### Why this matches the current implementation
The current code already moved `AlertDialog` ownership to `RulesTab`, which avoids the row-unmount cleanup bug. But `RuleCard` still opens parent-owned overlay state from inside a `DropdownMenuItem` selection callback in the same tick:

```text
DropdownMenu item select
-> parent state update opens Sheet / AlertDialog
-> DropdownMenu close cleanup is still in progress
-> Radix modal-stack body pointer-events bookkeeping can race
```

So the remaining fix is the documented `preventDefault()` + `requestAnimationFrame(...)` handoff at the menu-item level.

### File to update

#### `src/components/dashboard/recruitment/admin/rules/RuleCard.tsx`

Update the `Rediger` menu item from:

```tsx
<DropdownMenuItem onSelect={onEdit}>
```

to:

```tsx
<DropdownMenuItem
  onSelect={(e) => {
    e.preventDefault();
    requestAnimationFrame(() => onEdit());
  }}
>
```

Update the `Slett` menu item from:

```tsx
<DropdownMenuItem
  className="text-destructive focus:text-destructive"
  onSelect={onRequestDelete}
>
```

to:

```tsx
<DropdownMenuItem
  className="text-destructive focus:text-destructive"
  onSelect={(e) => {
    e.preventDefault();
    requestAnimationFrame(() => onRequestDelete());
  }}
>
```

### Expected result
- `DropdownMenu` finishes its close lifecycle before the Sheet or AlertDialog opens.
- `body` should no longer get stuck with `pointer-events: none`.
- Delete and edit should both avoid the same overlay-stack race.
- `Dupliser` remains unchanged since it does not open another overlay.

### Technical notes
This uses the standard Radix/shadcn handoff pattern:

```text
preventDefault()
-> stop immediate select-side overlay open during the same event
requestAnimationFrame(...)
-> wait one paint cycle
-> open the next overlay after DropdownMenu cleanup completes
```

### Verification after implementation
1. Hard refresh
2. Create a test rule
3. Open actions → `Slett`
4. Confirm delete
5. Inspect `<body>` in Elements:
   - no `pointer-events: none`
6. Confirm page remains clickable
7. Repeat 3 times
8. Also test `Rediger` 3 times to confirm the Sheet no longer intermittently freezes

### Return after implementation
Paste back:
1. The updated `Slett` `DropdownMenuItem`
2. The updated `Rediger` `DropdownMenuItem`
