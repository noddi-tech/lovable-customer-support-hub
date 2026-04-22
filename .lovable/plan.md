
Move the delete confirmation dialog out of `RuleCard` and into a stable parent so the Radix overlay survives row removal and can clean up `body { pointer-events: none; }` correctly.

### Files to update

#### 1. `src/components/dashboard/recruitment/admin/rules/RulesTab.tsx`
Add parent-owned delete state beside `editorState`:

```ts
const [ruleToDelete, setRuleToDelete] = useState<AutomationRule | null>(null);
```

Import:
- `toast` from `sonner`
- `useRuleMutations`
- the `AlertDialog` components from `@/components/ui/alert-dialog`
- `AutomationRule` type if needed as a type import

Initialize the delete mutation in `RulesTab`:

```ts
const { deleteRule } = useRuleMutations();
```

Add a parent-owned confirm handler:

```ts
const handleConfirmDelete = () => {
  if (!ruleToDelete) return;

  deleteRule.mutate(ruleToDelete.id, {
    onSuccess: () => {
      toast.success('Regel slettet');
      setRuleToDelete(null);
    },
    onError: (e: any) => {
      toast.error(e?.message ?? 'Kunne ikke slette');
      setRuleToDelete(null);
    },
  });
};
```

Pass delete intent down through `RulesList`:

```tsx
<RulesList
  rules={rules ?? []}
  lookups={lookups}
  onEdit={(rule) => setEditorState({ mode: 'edit', rule })}
  onRequestDelete={(rule) => setRuleToDelete(rule)}
/>
```

Render a single shared `AlertDialog` at the `RulesTab` level, as a sibling of `RuleEditor`, controlled by:

```tsx
<AlertDialog
  open={ruleToDelete !== null}
  onOpenChange={(open) => {
    if (!open) setRuleToDelete(null);
  }}
>
```

Dialog content should use `ruleToDelete?.name` and call `handleConfirmDelete` from `AlertDialogAction`.

This keeps the dialog mounted even if the selected `RuleCard` disappears from the list after delete invalidation.

#### 2. `src/components/dashboard/recruitment/admin/rules/RulesList.tsx`
Extend props:

```ts
interface Props {
  rules: AutomationRule[];
  lookups: RuleLookups;
  onEdit: (rule: AutomationRule) => void;
  onRequestDelete: (rule: AutomationRule) => void;
}
```

Thread the callback into each card:

```tsx
<RuleCard
  key={rule.id}
  rule={rule}
  lookups={lookups}
  onEdit={() => onEdit(rule)}
  onRequestDelete={() => onRequestDelete(rule)}
/>
```

No other list behavior changes.

#### 3. `src/components/dashboard/recruitment/admin/rules/RuleCard.tsx`
Simplify `RuleCard` so it no longer owns delete dialog lifecycle.

Update props:

```ts
interface Props {
  rule: AutomationRule;
  lookups: RuleLookups;
  onEdit: () => void;
  onRequestDelete: () => void;
}
```

Remove:
- `useState` import if no longer needed
- `dialogOpen` / `setDialogOpen`
- `pendingDelete` / `setPendingDelete`
- `handleDialogOpenChange`
- `handleConfirmDelete`
- `deleteRule` from `useRuleMutations()`
- the entire `AlertDialog` block at the bottom of the component
- the `AlertDialog*` imports

Keep `useRuleMutations()` only for the existing non-delete mutations:

```ts
const { toggleActive, duplicateRule } = useRuleMutations();
```

Update the delete menu item to delegate upward:

```tsx
<DropdownMenuItem
  className="text-destructive focus:text-destructive"
  onSelect={onRequestDelete}
>
```

That is the only delete-related behavior left in `RuleCard`.

### Expected result
- The delete confirmation dialog is no longer nested inside a row that may unmount.
- Deleting a rule removes the row without interrupting Radix cleanup.
- `body` should not retain `pointer-events: none` after the dialog closes.
- No other `RuleCard` flows change: edit, duplicate, toggle, and drag/drop remain untouched.

### Technical notes
Current failure mode:
```text
RuleCard owns AlertDialog
-> user confirms delete
-> mutation invalidates rules query
-> deleted row unmounts
-> AlertDialog unmounts mid-close
-> Radix cleanup misses body style removal
-> body remains pointer-events:none
-> whole page appears frozen
```

New structure:
```text
RulesTab owns AlertDialog + selected rule
RuleCard only requests delete
-> user confirms delete in parent dialog
-> mutation invalidates rules query
-> deleted row unmounts
-> parent dialog still exists long enough to finish cleanup
-> body style is cleared correctly
```

### Verification after implementation
1. Open rule actions for any rule and click `Slett`
2. Confirm `Slett regel`
3. The rule disappears
4. Inspect `<body>` in Elements:
   - `pointer-events: none` should not remain
5. Confirm the page is still interactive:
   - click another rule
   - click `Ny regel`
   - switch tabs

### Return for verification
After implementation, provide:
1. The new `useState` line and `handleConfirmDelete` from `RulesTab.tsx`
2. The updated prop signature in `RuleCard.tsx`
3. The updated delete `onSelect` handler in `RuleCard.tsx`
4. Confirmation that `RuleCard.tsx` no longer contains any `AlertDialog`
