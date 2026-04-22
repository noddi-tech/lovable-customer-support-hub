
Fix the delete-confirmation freeze in `src/components/dashboard/recruitment/admin/rules/RuleCard.tsx` using Approach A first.

### What to change

#### 1. Update `handleConfirmDelete`
Change the delete flow so the dialog closes first, then the mutation runs after the AlertDialog close animation finishes.

Replace the current pattern:

```ts
deleteRule.mutate(rule.id, {
  onSuccess: () => {
    toast.success('Regel slettet');
    setDeleteOpen(false);
  },
  ...
});
```

with:

```ts
setDeleteOpen(false);

setTimeout(() => {
  deleteRule.mutate(rule.id, {
    onSuccess: () => {
      toast.success('Regel slettet');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Kunne ikke slette'),
  });
}, 150);
```

This keeps the row mounted during the Radix close animation, so the overlay can clean up before the card disappears from the invalidated list.

#### 2. Keep the dialog wiring simple
Leave the dialog controlled as:

```tsx
<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
```

No full local-state/pending-delete restructure yet. Only escalate to Approach B if the freeze still reproduces after deploy.

#### 3. Keep the rest of `RuleCard` unchanged
Do not change:
- edit flow
- duplicate flow
- toggle-active flow
- DnD behavior
- dialog copy/styling

### Audit result to preserve
Within `RuleCard.tsx`, only the delete path needs this lifecycle fix:
- `Rediger` opens parent-managed editor state, no dialog close/unmount race here
- `Dupliser` is direct mutation + toast, no Radix overlay involved
- `toggleActive` is optimistic switch mutation, no modal lifecycle involved

### Expected behavior after fix
- Clicking `Slett regel` closes the AlertDialog immediately
- Dialog animation finishes cleanly
- Then the DELETE mutation runs
- Rule row disappears without leaving a blocked, unclickable page overlay

### Verification to provide after implementation
Paste back the post-change `handleConfirmDelete` function from `RuleCard.tsx`.

### User re-test
1. Open rule actions → `Slett`
2. Confirm delete with `Slett regel`
3. Dialog should close smoothly
4. Row should disappear after the short delay
5. Page should remain fully clickable

### Fallback only if still broken
If the freeze persists after this deploy, escalate to Approach B:
- separate `dialogOpen` and `pendingDelete`
- let `onOpenChange(false)` schedule the delete after animation
- keep mutation fully outside the confirmation click itself
