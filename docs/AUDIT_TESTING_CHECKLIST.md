# Audit Logging System - Testing Checklist

This checklist ensures comprehensive testing of the audit logging system.

## Pre-Testing Setup

- [ ] Have super_admin access to the application
- [ ] Have test user accounts with different roles (admin, agent, user)
- [ ] Have access to Supabase dashboard for database verification
- [ ] Have browser DevTools open for console error checking

---

## A. User Management Actions

### Role Assignment
- [ ] Assign a role to a user via UI
- [ ] Verify audit log created in `/super-admin/audit-logs`
- [ ] Check log contains:
  - [ ] Correct `action_type`: `user.role.assign`
  - [ ] Correct `actor_email`: Your email
  - [ ] Correct `actor_role`: super_admin
  - [ ] Correct `target_identifier`: Target user's email
  - [ ] `changes` object includes `{ role: \"role_name\", assigned: true }`
  - [ ] `organization_id` is set (if applicable)
  - [ ] Timestamp is accurate

### Role Removal
- [ ] Remove a role from a user via UI
- [ ] Verify audit log created
- [ ] Check `action_type`: `user.role.remove`
- [ ] Check `changes` includes `{ role: \"role_name\", removed: true }`

### User Profile Update
- [ ] Update user profile (name, email, etc.) via UI
- [ ] Verify audit log created
- [ ] Check `action_type`: `user.update`
- [ ] Check `changes` object includes the updates made
- [ ] Verify before/after values are captured

### User Deletion
- [ ] Delete a user via UI
- [ ] Verify audit log created
- [ ] Check `action_type`: `user.delete`
- [ ] Check `target_id` matches deleted user ID
- [ ] Check `changes` includes `{ deleted: true }`

### Organization Membership Role Update
- [ ] Update a user's role in an organization
- [ ] Verify audit log created
- [ ] Check `action_type`: `org.member.role.update`
- [ ] Check `changes` includes organization ID and new role
- [ ] Check `organization_id` field is populated

---

## B. Organization Management Actions

### Create Organization
- [ ] Create a new organization via UI
- [ ] Verify audit log created
- [ ] Check `action_type`: `org.create`
- [ ] Check `target_identifier`: Organization name
- [ ] Check `changes` includes org details (name, slug, colors)
- [ ] Check `organization_id` matches new org ID

### Update Organization
- [ ] Update organization settings via UI
- [ ] Verify audit log created
- [ ] Check `action_type`: `org.update`
- [ ] Check `changes` includes updated fields
- [ ] Check `organization_id` is correct

### Add User to Organization
- [ ] Add a user to an organization
- [ ] Verify audit log created
- [ ] Check `action_type`: `org.member.add`
- [ ] Check `target_identifier`: User's email
- [ ] Check `changes` includes org ID, org name, and role
- [ ] Check `organization_id` is populated

### Remove User from Organization
- [ ] Remove a user from an organization
- [ ] Verify audit log created
- [ ] Check `action_type`: `org.member.remove`
- [ ] Check `changes` includes `{ removed: true }`

### Delete Organization
- [ ] Delete an organization via UI
- [ ] Verify audit log created
- [ ] Check `action_type`: `org.delete`
- [ ] Check `changes` includes `{ deleted: true }`

---

## C. Row-Level Security (RLS) Testing

### Super Admin Access
- [ ] Login as super_admin
- [ ] Navigate to `/super-admin/audit-logs`
- [ ] Verify you can see audit logs
- [ ] Verify all logs are displayed (no filtering)

### Non-Super-Admin Access
- [ ] Login as admin (not super_admin)
- [ ] Try to navigate to `/super-admin/audit-logs`
- [ ] Verify access is denied OR no logs are shown
- [ ] Check console for RLS permission errors

### Insert Permission
- [ ] Login as any authenticated user
- [ ] Perform an action (e.g., update profile)
- [ ] Verify audit log is created successfully
- [ ] Verify `actor_id` matches current user

### Update Prevention (Immutability)
- [ ] Open Supabase SQL Editor
- [ ] Try to update an existing audit log:
  ```sql
  UPDATE admin_audit_logs 
  SET actor_email = 'test@example.com' 
  WHERE id = '<some-log-id>';
  ```
- [ ] Verify update is blocked by RLS policy
- [ ] Verify error message indicates policy violation

### Delete Prevention (Immutability)
- [ ] Open Supabase SQL Editor
- [ ] Try to delete an audit log:
  ```sql
  DELETE FROM admin_audit_logs WHERE id = '<some-log-id>';
  ```
- [ ] Verify delete is blocked by RLS policy
- [ ] Verify error message indicates policy violation

---

## D. UI/UX Testing

### Main Audit Logs Page

#### Search Functionality
- [ ] Enter actor email in search box
- [ ] Verify logs are filtered by actor
- [ ] Enter target identifier in search
- [ ] Verify logs are filtered by target
- [ ] Enter action type in search
- [ ] Verify logs are filtered by action
- [ ] Clear search, verify all logs return

#### Date Range Filtering
- [ ] Select \"Last 7 days\"
- [ ] Verify only logs from last 7 days shown
- [ ] Select \"Last 30 days\"
- [ ] Verify logs update
- [ ] Select \"Last 90 days\"
- [ ] Verify logs update
- [ ] Select \"All time\"
- [ ] Verify all logs shown
- [ ] Select \"Custom range\"
- [ ] Pick a date range from calendar
- [ ] Verify logs filtered to that range

#### Category Filtering
- [ ] Select \"User Management\" category
- [ ] Verify only user_management logs shown
- [ ] Select \"Organization\" category
- [ ] Verify only org_management logs shown
- [ ] Select \"Role Management\" category
- [ ] Verify role_management logs shown
- [ ] Select \"All categories\"
- [ ] Verify all logs return

#### Action Type Filtering
- [ ] Click on action type badges
- [ ] Select multiple action types
- [ ] Verify only selected types shown
- [ ] Deselect an action type
- [ ] Verify logs update
- [ ] Clear all action types
- [ ] Verify all logs return

#### Actor Role Filtering
- [ ] Click on actor role badges
- [ ] Select multiple roles
- [ ] Verify only logs from selected roles shown
- [ ] Deselect a role
- [ ] Verify logs update
- [ ] Clear all roles
- [ ] Verify all logs return

#### Combined Filters
- [ ] Apply search + date range + category
- [ ] Verify all filters work together
- [ ] Check active filter count is correct
- [ ] Click \"Clear all\" button
- [ ] Verify all filters reset

#### Auto-Refresh
- [ ] Click \"Auto-refresh On\" button
- [ ] Wait 30 seconds
- [ ] Perform an action that creates a log
- [ ] Verify new log appears automatically
- [ ] Click \"Auto-refresh Off\"
- [ ] Verify auto-refresh stops

#### CSV Export
- [ ] Apply some filters
- [ ] Click \"Export CSV\" button
- [ ] Verify CSV file downloads
- [ ] Open CSV in Excel/Sheets
- [ ] Verify data is correct and complete
- [ ] Verify headers are: Timestamp, Actor, Role, Action, Category, Target Type, Target, Changes

#### Log Details Modal
- [ ] Click on any log row
- [ ] Verify detail modal opens
- [ ] Check all sections are present:
  - [ ] Action Description
  - [ ] Actor Information (email, role, ID)
  - [ ] Action Details (type, category)
  - [ ] Target Information (type, identifier, ID)
  - [ ] Changes (formatted JSON)
  - [ ] Metadata (timestamp, org ID, user agent)
- [ ] Close modal
- [ ] Click another row
- [ ] Verify modal updates with new data

### Analytics Dashboard

#### Navigation
- [ ] Navigate to `/super-admin/audit-logs/analytics`
- [ ] Verify page loads without errors
- [ ] Check all charts render

#### Key Metrics Cards
- [ ] Verify \"Total Actions\" shows correct count
- [ ] Verify \"Unique Actors\" shows correct count
- [ ] Verify \"Action Types\" shows correct count
- [ ] Verify \"Risk Level\" badge displays (LOW/MEDIUM/HIGH)

#### Activity Heatmap
- [ ] Verify bar chart displays last 30 days
- [ ] Hover over bars
- [ ] Verify tooltip shows date and action count
- [ ] Check x-axis dates are correct
- [ ] Check y-axis scale is appropriate

#### Action Type Distribution
- [ ] Verify pie chart displays
- [ ] Check legend shows action types
- [ ] Hover over pie slices
- [ ] Verify tooltip shows action type and count
- [ ] Verify top 6 action types are shown

#### Most Active Users
- [ ] Verify list shows top 10 users
- [ ] Check ranking numbers (1-10)
- [ ] Check email addresses are displayed
- [ ] Check action counts are shown as badges
- [ ] Verify sorted by action count (descending)

#### Risk Indicators
- [ ] Verify \"Recent Deletion Actions\" count
- [ ] Check badge color (red if >5, gray otherwise)
- [ ] Verify \"Bulk Operations\" count
- [ ] Check badge color (red if >3, gray otherwise)
- [ ] Verify \"High Activity Users\" count
- [ ] Check badge color (red if >2, gray otherwise)

### User Activity Timeline

#### Access from User Management
- [ ] Go to All Users Management page
- [ ] Find a user who has activity
- [ ] Click \"View Activity\" button
- [ ] Verify modal/drawer opens with timeline

#### Timeline Display
- [ ] Verify actions are shown chronologically (newest first)
- [ ] Check action icons match action types
- [ ] Check action descriptions are readable
- [ ] Verify timestamps are formatted correctly
- [ ] Check target information is displayed

#### Summary Stats
- [ ] Verify total actions count is correct
- [ ] Check most common action is identified
- [ ] Verify date range is shown

---

## E. Data Integrity Testing

### Required Fields
- [ ] Verify `actor_id` is never null in logs
- [ ] Verify `actor_email` is never null
- [ ] Verify `actor_role` is never null
- [ ] Verify `action_type` is never null
- [ ] Verify `action_category` is never null
- [ ] Verify `target_type` is never null
- [ ] Verify `target_identifier` is never null

### Data Accuracy
- [ ] Check actor information matches current user
- [ ] Check target information matches affected entity
- [ ] Check timestamps are within reasonable range (< 1 second difference)
- [ ] Check organization_id matches when applicable

### Changes Object
- [ ] Verify changes object contains meaningful data
- [ ] For updates: Check both old and new values present (if tracked)
- [ ] For creates: Check new entity data is captured
- [ ] For deletes: Check deletion flag is set
- [ ] For role changes: Check role name is captured

### Metadata Object
- [ ] Verify `metadata.timestamp` exists
- [ ] Verify `metadata.user_agent` contains browser info
- [ ] Verify `metadata.server_timestamp` exists (added by trigger)
- [ ] Check server_timestamp is close to created_at (< 1 second)

---

## F. Performance Testing

### Page Load
- [ ] Navigate to audit logs page
- [ ] Measure load time (should be < 2 seconds)
- [ ] Check browser DevTools Network tab
- [ ] Verify reasonable number of requests (< 10)

### Large Dataset
- [ ] Apply \"All time\" date range (if you have 500+ logs)
- [ ] Verify page remains responsive
- [ ] Verify scrolling is smooth
- [ ] Check memory usage in DevTools (should not grow excessively)

### Search Performance
- [ ] Enter search query
- [ ] Verify results appear instantly (< 200ms)
- [ ] Change search query multiple times quickly
- [ ] Verify no lag or freezing

### Filter Performance
- [ ] Apply multiple filters rapidly
- [ ] Verify UI remains responsive
- [ ] Check no flickering or re-render issues

### Auto-Refresh Memory
- [ ] Enable auto-refresh
- [ ] Leave page open for 5 minutes
- [ ] Check memory usage in DevTools
- [ ] Verify no memory leaks (memory should stabilize)
- [ ] Disable auto-refresh

---

## G. Error Handling

### Missing Required Data
- [ ] In browser console, try creating log without `actor_email`:
  ```javascript
  await supabase.from('admin_audit_logs').insert({
    actor_id: '<uuid>',
    action_type: 'test.action',
    action_category: 'test',
    target_type: 'user',
    target_identifier: 'test'
  });
  ```
- [ ] Verify error is caught and logged
- [ ] Verify main operation doesn't break

### Network Errors
- [ ] Open DevTools Network tab
- [ ] Throttle network to \"Slow 3G\"
- [ ] Perform an action that creates log
- [ ] Verify operation completes even if log fails
- [ ] Check console for graceful error handling

### Invalid Data
- [ ] Try to insert log with invalid UUID:
  ```javascript
  await supabase.from('admin_audit_logs').insert({
    actor_id: 'not-a-uuid',
    // ... other fields
  });
  ```
- [ ] Verify appropriate error message
- [ ] Verify application doesn't crash

---

## H. Security Testing

### SQL Injection
- [ ] Try SQL injection in search box:
  ```
  '; DROP TABLE admin_audit_logs; --
  ```
- [ ] Verify search works safely (no SQL executed)
- [ ] Verify table is not affected

### XSS (Cross-Site Scripting)
- [ ] Create user with malicious name: `<script>alert('xss')</script>`
- [ ] Perform action with that user
- [ ] View audit log
- [ ] Verify script doesn't execute
- [ ] Verify text is properly escaped

### Authorization Bypass
- [ ] Login as non-super-admin user
- [ ] Try to access audit logs via direct URL
- [ ] Try to query `admin_audit_logs` via Supabase client
- [ ] Verify all attempts are blocked
- [ ] Check for proper error messages

---

## I. Compliance Reporting

### Generate Report
- [ ] Click \"Generate Report\" button
- [ ] Select a date range
- [ ] Click \"Export CSV\"
- [ ] Verify CSV downloads

### Report Contents
- [ ] Open CSV in Excel/Sheets
- [ ] Verify all filtered logs are included
- [ ] Check column headers are descriptive
- [ ] Verify timestamps are formatted correctly
- [ ] Check changes are readable (not raw JSON)

### Report Completeness
- [ ] Generate report for last 7 days
- [ ] Manually count logs for same period
- [ ] Verify counts match

---

## J. Edge Cases

### Concurrent Actions
- [ ] Open app in two browser tabs
- [ ] Perform actions in both tabs simultaneously
- [ ] Verify both logs are created
- [ ] Verify no race conditions or data loss

### Bulk Operations
- [ ] Test bulk operations logging (if implemented)
- [ ] Verify single log entry for bulk action
- [ ] Check summary includes total, success, failure counts

### Deleted Entities
- [ ] Delete a user
- [ ] View logs for that user
- [ ] Verify logs still display correctly
- [ ] Verify target_identifier shows email (not just ID)

### Long Running Operations
- [ ] Start a long operation (if any)
- [ ] Verify audit log is created with operation start
- [ ] Verify completion is logged (if tracked)

---

## K. Browser Compatibility

Test in multiple browsers:

### Chrome/Edge
- [ ] All features work
- [ ] Charts render correctly
- [ ] No console errors

### Firefox
- [ ] All features work
- [ ] Charts render correctly
- [ ] No console errors

### Safari
- [ ] All features work
- [ ] Charts render correctly
- [ ] No console errors

---

## L. Mobile Responsiveness

### Mobile View
- [ ] Open audit logs on mobile device (or use DevTools device mode)
- [ ] Verify table is scrollable horizontally
- [ ] Verify filters are accessible
- [ ] Verify charts are readable
- [ ] Verify modal displays correctly

---

## Summary Report

After completing all tests, summarize:

**Passed**: ___ / Total Tests  
**Failed**: ___ / Total Tests  
**Blocked**: ___ / Total Tests  

### Critical Issues Found
1. 
2. 
3. 

### Minor Issues Found
1. 
2. 
3. 

### Recommendations
1. 
2. 
3. 

---

**Tested By**: _______________  
**Date**: _______________  
**Version**: 1.0.0
