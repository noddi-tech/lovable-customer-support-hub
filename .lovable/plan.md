
Escalate the `RuleCard` delete flow from Approach A to Approach B in `src/components/dashboard/recruitment/admin/rules/RuleCard.tsx`.

### Scope
Only restructure the delete-confirmation lifecycle. Do not change edit, duplicate, toggle, drag-and-drop, styling, copy, or any other behavior.

### Changes to make

#### 1. Replace the old delete dialog state
Remove:

```ts
const [deleteOpen, setDeleteOpen] = useState(false);
```

Add:

```ts
const [dialogOpen, setDialogOpen] = useState(false);
const [pendingDelete, setPendingDelete] = useState(false);
```

#### 2. Add a controlled dialog open-change handler
Create:

```ts
const handleDialogOpenChange = (open: boolean) => {
  setDialogOpen(open);

  if (!open && pendingDelete) {
    setTimeout(() => {
      deleteRule.mutate(rule.id, {
        onSuccess: () => toast.success('Regel slettet'),
        onError: (e: any) => toast.error(e?.message ?? 'Kunne ikke slette'),
      });
      setPendingDelete(false);
    }, 150);
  }
};
```

This makes the dialog close first, then runs the delete after Radix has had time to finish cleanup.

#### 3. Replace `handleConfirmDelete`
Change it to only mark deletion intent and close the dialog:

```ts
const handleConfirmDelete = () => {
  setPendingDelete(true);
  setDialogOpen(false);
};
```

#### 4. Update the dropdown delete trigger
Replace the delete menu item handler from:

```ts
onSelect={() => setDeleteOpen(true)}
```

to:

```ts
onSelect={() => setDialogOpen(true)}
```

#### 5. Rewire the AlertDialog
Replace:

```tsx
<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
```

with:

```tsx
<AlertDialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
```

#### 6. Remove all old delete state references
Ensure there are no remaining references to:
- `deleteOpen`
- `setDeleteOpen`

That includes the current Approach A close-first handler.

### Expected result
- Clicking `Slett` opens the dialog normally.
- Clicking `Slett regel` closes the dialog first.
- After the close animation window, the delete mutation runs.
- The rule row unmounts only after the dialog lifecycle has finished.
- The page remains clickable with no stuck overlay.

### Verification to return after implementation
Paste back:
1. The two new state declarations
2. `handleDialogOpenChange`
3. `handleConfirmDelete`
4. The updated `AlertDialog` opening tag

### User re-test
1. Open rule actions → `Slett`
2. Confirm with `Slett regel`
3. Dialog should close cleanly
4. Rule row should disappear after the short delay
5. Page should remain fully interactive
