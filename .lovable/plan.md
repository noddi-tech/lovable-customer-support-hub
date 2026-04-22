
## Plan: Fix `assign_to` user lookup + Sheet close freeze in recruitment automation

### Scope
Apply two targeted frontend fixes in the existing Phase 2 Rules UI. No schema, RLS, or backend changes.

### 1. Fix `assign_to` dropdown query in `useRules.ts`

Update `useAssignableUsersForOrg()` to stop using the failing nested PostgREST select:

```ts
profiles:user_id(id, full_name, email)
```

That join cannot work because `organization_memberships.user_id` points to `auth.users`, not `public.profiles`.

#### Replace with a two-query flow
1. Query `organization_memberships` for:
   - `user_id`
   - `role`
   - `status`
   filtered by:
   - current `organization_id`
   - `status = 'active'`
   - `role IN ('admin', 'super_admin', 'agent')`

2. If no memberships, return `[]`.

3. Build:
   - `userIds` array from membership `user_id`
   - `roleByUserId` map

4. Query `profiles` with:
   - `select('id, user_id, full_name, email')`
   - `.in('user_id', userIds)`

5. Map profiles into the existing dropdown shape:
   - `id: p.id`  ← critical: this stays `profiles.id`
   - `full_name: p.full_name ?? p.email ?? null`
   - `role: roleByUserId.get(p.user_id) ?? 'unknown'`

6. Sort by display name with Norwegian locale as today.

#### Important contract to preserve
Even though the config field is named `action_config.user_id`, it must continue storing `profiles.id`, because that is what rule execution expects downstream.

### 2. Fix RuleEditor close timing bug in `RuleEditor.tsx`

Current save success handlers call `onClose()` synchronously in the same tick as the success toast, which can leave the Radix Sheet overlay stack in a broken state.

#### Apply Fix 2a only
In both success handlers:
- create flow
- update flow

change:

```ts
toast.success(...)
onClose()
```

to:

```ts
toast.success(...)
setTimeout(() => onClose(), 0)
```

This keeps the existing controlled `Sheet open={open}` pattern, but lets Radix finish its internal close/update cycle before the parent clears `editorState`.

#### Keep the rest unchanged
- Do not change the `Sheet` API yet
- Keep:

```ts
<Sheet open={open} onOpenChange={(o) => !o && onClose()}>
```

Only escalate to a deeper `onOpenChange` restructuring if the freeze still reproduces after this deploy.

### Files to edit
- `src/components/dashboard/recruitment/admin/rules/hooks/useRules.ts`
- `src/components/dashboard/recruitment/admin/rules/RuleEditor.tsx`

### Expected post-fix behavior
1. `assign_to` no longer triggers PGRST200.
2. The user dropdown populates with org-scoped active admins/agents.
3. Saved `action_config.user_id` continues to be a `profiles.id`.
4. Editing or creating a rule closes the Sheet cleanly after save.
5. The page remains clickable after the success toast.

### Reply/verification after implementation
After applying the fix, paste back:
1. The full post-change contents of `useAssignableUsersForOrg()`
2. The two post-change `onSuccess` blocks from `RuleEditor.tsx`

### User re-test
- Edit an existing rule and save → no frozen/unclickable screen
- Create/edit a rule with `assign_to` → dropdown loads correctly and save succeeds
