# Audit Logging - Quick Start Guide

## For Super Admins

### Viewing Audit Logs

1. **Access the Audit Logs Page**
   - Navigate to: `/super-admin/audit-logs`
   - Or: Click "Audit Logs" in the super admin menu

2. **Filter Logs**
   - Use the search box to find specific actors or targets
   - Select a date range (Last 7/30/90 days, or custom)
   - Filter by category (User Management, Organization, etc.)
   - Click action type or role badges to filter

3. **View Details**
   - Click any log row to see full details
   - Modal shows actor info, action details, and changes

4. **Export Data**
   - Click "Export CSV" to download logs
   - Great for compliance reporting

5. **Auto-Refresh**
   - Enable auto-refresh to see new logs in real-time
   - Updates every 30 seconds

### Analytics Dashboard

1. **Access Analytics**
   - Navigate to: `/super-admin/audit-logs/analytics`
   - Or: Click "Analytics" button on audit logs page

2. **Key Metrics**
   - See total actions, unique actors, and risk level
   - Monitor activity trends over 30 days
   - Identify most active users
   - Review risk indicators

### User Activity Timeline

1. **View User Activity**
   - Go to All Users Management
   - Click "View Activity" next to any user
   - See chronological timeline of their actions

## For Developers

### Adding Audit Logging to New Features

```typescript
import { useAuditLog } from '@/hooks/useAuditLog';

function MyComponent() {
  const { logAction } = useAuditLog();

  const handleAction = async () => {
    // Perform your action
    await updateSomething();

    // Log it
    await logAction(
      'custom.action',        // Action type
      'resource',             // Target type
      resourceId,             // Target ID
      resourceName,           // Human-readable identifier
      { /* changes */ },      // What changed
      organizationId          // Optional org context
    );
  };
}
```

### Available Action Types

#### User Management
- `user.create` - User created ✅ **NEW: Auto-logged**
- `user.update` - Profile updated
- `user.delete` - User deleted
- `user.role.assign` - Role assigned
- `user.role.remove` - Role removed

#### Organization Management
- `org.create` - Org created
- `org.update` - Org updated
- `org.delete` - Org deleted
- `org.member.add` - Member added
- `org.member.remove` - Member removed
- `org.member.role.update` - Member role changed

#### Bulk Operations
- `bulk.users.import` - Import multiple users
- `bulk.users.export` - Export user data
- `bulk.roles.assign` - Assign roles to multiple users

#### System Settings ✅ **NEW in Phase 8**
- `setting.integration.update` - Integration config changes (Aircall, Voice, etc.)
- `setting.organization.update` - Organization branding/settings updates
- `setting.system.update` - System-wide configuration changes

### Action Categories

- `user_management` - User-related actions
- `org_management` - Organization actions
- `role_management` - Role changes
- `bulk_management` - Bulk operations
- `setting_management` - System and integration settings ✅ **NEW**

### Security Rules

✅ **Always log these actions:**
- User creation/deletion
- Role assignments/removals
- Organization changes
- Membership changes
- Security-related updates
- Integration/system settings changes ✅ **NEW**

❌ **Don't log:**
- Regular user activities (viewing, reading)
- System-generated actions
- Non-administrative operations

### Best Practices

1. **Include context**: Use meaningful identifiers (emails, names)
2. **Capture changes**: Include what changed, not just that it changed
3. **Handle errors**: Wrap logging in try-catch, don't break main flow
4. **Be consistent**: Use established action types and categories
5. **Test thoroughly**: Verify logs are created for all new features

## Troubleshooting

### "No audit logs showing"
- ✅ Check you're logged in as super_admin
- ✅ Try "All time" date range
- ✅ Clear all filters

### "Cannot create audit log"
- ✅ Ensure user is authenticated
- ✅ Check all required fields are provided
- ✅ Look for console errors

### "Logs are slow to load"
- ✅ Use date range filters
- ✅ Don't query "All time" with 1000+ logs
- ✅ Apply specific filters to reduce dataset

## Quick Links

- 📘 [Full Documentation](./AUDIT_LOGGING.md)
- ✅ [Testing Checklist](./AUDIT_TESTING_CHECKLIST.md)
- 🔐 [Security Summary](./AUDIT_SECURITY.md)
- 🗄️ [Database Schema](../supabase/migrations/)

## Support

Questions? Check:
1. This quick start guide
2. Full documentation
3. Code implementation in `src/hooks/useAuditLog.ts`
4. Supabase dashboard for database details
