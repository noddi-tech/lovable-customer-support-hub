

## Add "Change Email" to Admin User Management

### What it does
Adds a "Change Email" option to the user action menu in Admin > Users. Opens a dialog where a super admin enters the new email, and the system updates both `auth.users` and `profiles` in one operation.

### Why an edge function is needed
The Supabase client-side SDK cannot update `auth.users` email for other users. We need `supabase.auth.admin.updateUserById()` which requires the service role key, so this must run server-side.

### Plan

| # | File | Change |
|---|------|--------|
| 1 | `supabase/functions/admin-update-user-email/index.ts` | New edge function: validates caller is super_admin, calls `auth.admin.updateUserById({ email })`, updates `profiles.email`, logs audit action |
| 2 | `src/components/admin/ChangeEmailDialog.tsx` | New dialog component: input for new email, confirm button, shows current email |
| 3 | `src/hooks/useUserManagement.ts` | Add `changeEmail` mutation that invokes the edge function |
| 4 | `src/components/admin/UserActionMenu.tsx` | Add "Change Email" menu item and wire up the new dialog |

### Edge function details
- Auth: extract caller from `Authorization` header, verify `super_admin` role via `user_roles` table
- Action: `adminClient.auth.admin.updateUserById(userId, { email: newEmail })` then `UPDATE profiles SET email = newEmail WHERE user_id = userId`
- Audit: log `user.email.change` with old and new email
- Validation: basic email format check, prevent changing own email

### UI
- New dropdown item with `AtSign` icon between "Manage Organizations" and the delete separator
- Dialog shows current email (read-only), input for new email, Save/Cancel buttons
- Loading state while mutation runs

