# Audit Logging Testing Guide

## Overview
This guide provides step-by-step instructions for testing the complete audit logging system to ensure all administrative actions are properly tracked and secured.

## Prerequisites
- Super admin access to the system
- Multiple test user accounts with different roles (admin, agent, user)
- Access to Supabase dashboard for database verification
- Browser DevTools open for debugging

## Phase 8 Test Coverage

### ✅ Step 1: User Creation Logging
**Test:** Create a new user and verify audit log is created

1. Navigate to `/super-admin/users`
2. Click "Create User" button
3. Fill in user details:
   - Email: `test@example.com`
   - Full Name: `Test User`
   - Department: Select any
   - Role: `agent`
4. Submit form
5. Navigate to `/super-admin/audit-logs`
6. Verify audit log entry with:
   - `action_type`: `user.create`
   - `target_type`: `user`
   - `target_identifier`: `test@example.com`
   - `changes` contains: `email`, `full_name`, `department_id`, `primary_role`

**Expected Result:** ✅ Audit log created with all user details

---

### ✅ Step 2: Integration Settings Logging
**Test:** Update Aircall integration and verify audit log

1. Navigate to `/admin/settings` → Aircall tab
2. Modify webhook token or phone numbers
3. Click "Save Settings"
4. Navigate to `/super-admin/audit-logs`
5. Verify audit log entry with:
   - `action_type`: `setting.integration.update`
   - `target_type`: `setting`
   - `target_identifier`: `aircall Integration`
   - `changes` contains configuration details

**Expected Result:** ✅ Integration changes are logged

---

### ✅ Step 3: Organization Settings Logging
**Test:** Update organization branding and verify audit log

1. Navigate to `/admin/settings` → General tab
2. Modify organization name or description
3. Click "Save Branding"
4. Navigate to `/super-admin/audit-logs`
5. Verify audit log entry with:
   - `action_type`: `setting.organization.update`
   - `target_type`: `setting`
   - `target_identifier`: Organization name
   - `changes` contains: `name`, `description`, `sender_display_name`

**Expected Result:** ✅ Organization settings changes are logged

---

### ✅ Step 4: Database Security Validation
**Test:** Verify function security fixes

1. Access Supabase SQL Editor
2. Run the following query:
```sql
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  proconfig as search_path_config
FROM pg_proc
WHERE proname IN (
  'validate_audit_log',
  'detect_suspicious_audit_activity',
  'count_old_audit_logs'
);
```
3. Verify all functions have:
   - `security_definer`: `true`
   - `search_path_config`: `{search_path=public,pg_temp}`

**Expected Result:** ✅ All functions properly secured

---

### ✅ Step 5: Audit Log Immutability
**Test:** Verify logs cannot be modified or deleted

1. Access Supabase SQL Editor
2. Attempt to update a log:
```sql
UPDATE admin_audit_logs 
SET actor_email = 'hacker@example.com' 
WHERE id = (SELECT id FROM admin_audit_logs LIMIT 1);
```
3. Attempt to delete a log:
```sql
DELETE FROM admin_audit_logs 
WHERE id = (SELECT id FROM admin_audit_logs LIMIT 1);
```

**Expected Result:** ✅ Both operations fail with RLS policy error

---

### ✅ Step 6: Role-Based Access Testing
**Test:** Verify only super_admin can view audit logs

1. **As super_admin:**
   - Navigate to `/super-admin/audit-logs`
   - Verify logs are visible

2. **As admin:**
   - Navigate to `/super-admin/audit-logs`
   - Verify no access or empty results

3. **As regular user:**
   - Verify cannot access super admin routes

**Expected Result:** ✅ Only super_admin can view logs

---

### ✅ Step 7: Analytics Dashboard Testing
**Test:** Verify analytics page displays correctly

1. Generate multiple audit logs (5-10 actions)
2. Navigate to `/super-admin/audit-logs/analytics`
3. Verify all sections display:
   - Key metrics (Total Logs, Unique Actors, etc.)
   - Activity heatmap chart
   - Action type distribution pie chart
   - Top 5 most active users
   - Risk indicators

**Expected Result:** ✅ All analytics components render with data

---

### ✅ Step 8: Advanced Filtering
**Test:** Verify all filter options work correctly

1. Navigate to `/super-admin/audit-logs`
2. Test date range filters:
   - Last 7 days
   - Last 30 days
   - Custom range
3. Test search:
   - Search by actor email
   - Search by target identifier
4. Test action type badges:
   - Click on a badge to filter
5. Test actor role filter:
   - Filter by super_admin, admin, etc.

**Expected Result:** ✅ All filters work and combine properly

---

### ✅ Step 9: User Activity Timeline
**Test:** Verify individual user activity tracking

1. Navigate to `/super-admin/users`
2. Click "View Activity" for any user
3. Verify timeline shows:
   - All actions by that user
   - Chronological order
   - Action details expandable

**Expected Result:** ✅ User timeline displays correctly

---

### ✅ Step 10: CSV Export
**Test:** Verify export functionality

1. Navigate to `/super-admin/audit-logs`
2. Apply some filters
3. Click "Export CSV"
4. Open downloaded file
5. Verify contains:
   - All filtered logs
   - Proper column headers
   - Readable date format
   - Complete change data

**Expected Result:** ✅ CSV export contains all expected data

---

## Comprehensive Action Coverage

### User Management Actions
- [x] `user.create` - User creation
- [x] `user.update` - Profile updates
- [x] `user.delete` - User deletion
- [x] `user.role.assign` - Role assignment
- [x] `user.role.remove` - Role removal

### Organization Management Actions
- [x] `org.create` - Organization creation
- [x] `org.update` - Organization updates
- [x] `org.delete` - Organization deletion
- [x] `org.member.add` - Member addition
- [x] `org.member.remove` - Member removal
- [x] `org.member.role.update` - Member role update

### Settings Management Actions
- [x] `setting.integration.update` - Integration changes (Aircall, Voice, etc.)
- [x] `setting.organization.update` - Organization branding/settings
- [x] `setting.system.update` - System-wide settings

### Bulk Operations
- [x] `bulk.users.import` - User import operations
- [x] `bulk.users.export` - User export operations
- [x] `bulk.roles.assign` - Bulk role assignments

---

## Performance Testing

### Load Test
1. Generate 100+ audit logs
2. Navigate to audit logs page
3. Verify page loads in < 2 seconds
4. Apply filters and verify response time < 500ms

### Search Performance
1. Create 1000+ audit logs (use bulk operations)
2. Test search with various queries
3. Verify results return in < 1 second

---

## Error Handling Testing

### Network Errors
1. Disconnect network
2. Attempt to view audit logs
3. Verify graceful error message

### Invalid Data
1. Verify validation trigger catches:
   - Missing `actor_id`
   - Empty `action_type`
   - Null required fields

---

## Security Testing

### SQL Injection
1. Attempt SQL injection in search fields:
   - `'; DROP TABLE admin_audit_logs; --`
   - `' OR '1'='1`
2. Verify no errors or security breaches

### XSS Testing
1. Create user with malicious name:
   - `<script>alert('XSS')</script>`
2. View audit logs
3. Verify script does not execute

---

## Compliance Report Testing

### Generate Report
1. Navigate to audit logs
2. Click "Generate Report"
3. Select date range
4. Download report
5. Verify contains:
   - Executive summary
   - Action breakdown
   - User activity summary
   - Risk assessment
   - Compliance checklist

---

## Test Results Summary

| Test Category | Tests Passed | Tests Failed | Status |
|--------------|-------------|--------------|---------|
| User Creation Logging | - | - | ⏳ Pending |
| Integration Settings | - | - | ⏳ Pending |
| Organization Settings | - | - | ⏳ Pending |
| Database Security | - | - | ⏳ Pending |
| Immutability | - | - | ⏳ Pending |
| Role-Based Access | - | - | ⏳ Pending |
| Analytics Dashboard | - | - | ⏳ Pending |
| Advanced Filtering | - | - | ⏳ Pending |
| User Timeline | - | - | ⏳ Pending |
| CSV Export | - | - | ⏳ Pending |
| Performance | - | - | ⏳ Pending |
| Security | - | - | ⏳ Pending |

---

## Known Issues

_Document any issues found during testing here_

---

## Sign-Off

**Tested by:** _________________  
**Date:** _________________  
**Environment:** _________________  
**Overall Status:** ⏳ In Progress / ✅ Passed / ❌ Failed  

---

## Next Steps

After completing all tests:
1. Document any issues found
2. Create tickets for bugs
3. Re-test after fixes
4. Final sign-off for production deployment
