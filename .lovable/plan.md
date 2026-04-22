
Fix the still-deployed `created_by` FK bug in `src/components/dashboard/recruitment/admin/rules/hooks/useRuleMutations.ts`.

### Confirmed current state
The file still contains the old values:
- `createRule` → `created_by: user?.id ?? null`
- `duplicateRule` → `created_by: user?.id ?? null`

So the previous fix was not actually written into the source that is deployed.

### Changes to make
1. In `createRule`, replace:
   ```ts
   created_by: user?.id ?? null
   ```
   with:
   ```ts
   created_by: null
   ```

2. In `duplicateRule`, replace:
   ```ts
   created_by: user?.id ?? null
   ```
   with:
   ```ts
   created_by: null
   ```

3. Clean up the now-unused auth reference in the same file:
   - remove `useAuth` import
   - remove `const { user } = useAuth();`

This keeps the file build-clean after the two `created_by` changes.

### Verification after patch
1. Rebuild/redeploy the app.
2. Re-open `/admin/recruitment?tab=automation`.
3. Create a rule and confirm the POST to `/rest/v1/recruitment_automation_rules` no longer sends the auth user UUID in `created_by`.
4. Confirm the 409 FK error is gone.

### Exact post-change lines that should be present
```ts
created_by: null
created_by: null
```
