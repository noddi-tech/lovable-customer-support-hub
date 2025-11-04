# Audit Logging System Documentation

## Overview

The audit logging system provides comprehensive tracking of all administrative and user management actions within the application. This system is designed for compliance, security monitoring, and accountability.

## Table of Contents

1. [What Actions Are Logged](#what-actions-are-logged)
2. [Accessing Audit Logs](#accessing-audit-logs)
3. [Data Structure](#data-structure)
4. [Security Features](#security-features)
5. [Analytics & Reporting](#analytics--reporting)
6. [Data Retention Policy](#data-retention-policy)
7. [Compliance Considerations](#compliance-considerations)
8. [API Usage](#api-usage)
9. [Performance Considerations](#performance-considerations)

---

## What Actions Are Logged

### User Management Actions
- **user.role.assign**: When a role is assigned to a user
- **user.role.remove**: When a role is removed from a user
- **user.update**: When user profile information is updated
- **user.delete**: When a user account is deleted
- **user.create**: When a new user account is created

### Organization Management Actions
- **org.create**: When a new organization is created
- **org.update**: When organization details are updated
- **org.delete**: When an organization is deleted
- **org.member.add**: When a user is added to an organization
- **org.member.remove**: When a user is removed from an organization
- **org.member.role.update**: When a user's role in an organization is changed

### Bulk Operations
- **bulk.users.import**: When multiple users are imported
- **bulk.users.export**: When user data is exported
- **bulk.roles.assign**: When roles are assigned to multiple users

---

## Accessing Audit Logs

### Web Interface

**Super Admins Only**: Audit logs are only accessible to users with the `super_admin` role.

#### Main Audit Log Page
Navigate to: `/super-admin/audit-logs`

Features:
- View all audit logs in a searchable, filterable table
- Filter by date range (7d, 30d, 90d, all time, custom)
- Filter by action category
- Filter by action types (multi-select)
- Filter by actor roles (multi-select)
- Search by actor email, target, or action
- Export to CSV
- Auto-refresh (every 30 seconds)

#### Analytics Dashboard
Navigate to: `/super-admin/audit-logs/analytics`

Features:
- Activity heatmap (last 30 days)
- Action type distribution (pie chart)
- Most active users
- Risk indicators and alerts
- Key metrics (total actions, unique actors, risk level)

#### User Activity Timeline
Access from: All Users Management page → "View Activity" button

Features:
- View all actions performed by a specific user
- Chronological timeline with visual indicators
- Filter by action type
- Summary statistics

---

## Data Structure

Each audit log entry contains:

```typescript
{
  id: string;                           // Unique log entry ID
  created_at: timestamp;                // When the action occurred
  actor_id: string;                     // User ID who performed the action
  actor_email: string;                  // Email of the actor
  actor_role: string;                   // Role of the actor at time of action
  action_type: string;                  // Specific action (e.g., "user.role.assign")
  action_category: string;              // Category (e.g., "user_management")
  target_type: string;                  // Type of target (user, organization, role)
  target_id: string;                    // ID of the target entity
  target_identifier: string;            // Human-readable target (email, name)
  changes: object;                      // Details of what changed
  metadata: {                           // Additional context
    timestamp: string;                  // Client timestamp
    user_agent: string;                 // Browser/client information
    server_timestamp: string;           // Server-side timestamp (added automatically)
  };
  organization_id?: string;             // Associated organization (if applicable)
}
```

---

## Security Features

### Immutability
**Audit logs are immutable** - once created, they cannot be modified or deleted:
- UPDATE operations are blocked by Row-Level Security (RLS) policy
- DELETE operations are blocked by RLS policy
- This ensures audit trail integrity and prevents tampering

### Access Control
- **Super Admins**: Full read access to all audit logs
- **Other Users**: No access (all queries return empty)
- Logs can only be inserted by authenticated users for their own actions

### Data Validation
A database trigger (`validate_audit_log`) ensures:
- All required fields are present (actor, action, target information)
- Changes and metadata objects are initialized
- Server timestamp is automatically added to metadata

### Monitoring & Alerts

**Suspicious Activity Detection**:
The system includes a function to detect unusual patterns:
```sql
SELECT * FROM detect_suspicious_audit_activity(
  time_window_minutes := 5,    -- Look back 5 minutes
  action_threshold := 50        -- Alert if >50 actions
);
```

This can be used to:
- Detect potential account compromise
- Identify automated attacks
- Monitor for privilege escalation attempts

---

## Analytics & Reporting

### Built-in Analytics

1. **Activity Heatmap**: Visualizes action frequency over the last 30 days
2. **Action Distribution**: Shows breakdown of action types
3. **Top Actors**: Lists most active users
4. **Risk Indicators**: Highlights suspicious patterns:
   - Recent deletion actions
   - Bulk operations
   - High-activity users

### Compliance Reports

Generate compliance reports from the Audit Logs page:
- Custom date range selection
- CSV export format
- Includes all audit data for the selected period

Use cases:
- SOC 2 audit requirements
- ISO 27001 compliance
- GDPR access tracking
- Internal security reviews

---

## Data Retention Policy

### Current Policy
- Audit logs are retained indefinitely by default
- No automatic deletion or archival

### Monitoring Old Logs
Check the age of audit logs:
```sql
SELECT count_old_audit_logs(365);  -- Count logs older than 365 days
```

### Recommended Practices
1. **Short-term (< 90 days)**: Keep for operational monitoring
2. **Medium-term (90-365 days)**: Keep for compliance and investigations
3. **Long-term (> 365 days)**: Archive to cold storage (manual process)

**Important**: Ensure your retention policy complies with:
- Regulatory requirements (GDPR, HIPAA, etc.)
- Industry standards (SOC 2, ISO 27001)
- Organizational policies

---

## Compliance Considerations

### GDPR Compliance
- Audit logs may contain personal data (emails, names)
- Include audit logs in data subject access requests (DSARs)
- Consider pseudonymization for long-term storage
- Document lawful basis for processing (legitimate interest)

### SOC 2 Compliance
Audit logs support SOC 2 requirements:
- **CC6.3**: Logical access violations are identified and acted upon
- **CC7.2**: System operations are monitored
- **CC7.3**: Configurations are monitored for changes

### ISO 27001 Compliance
Supports controls:
- **A.12.4.1**: Event logging
- **A.12.4.3**: Administrator and operator logs
- **A.12.4.4**: Clock synchronization

### HIPAA Compliance
- Audit logs track access to protected health information (PHI)
- Satisfies access control requirements (§164.308(a)(4))
- Supports audit and accountability (§164.312(b))

---

## API Usage

### Logging Actions (Frontend)

```typescript
import { useAuditLog } from '@/hooks/useAuditLog';

function MyComponent() {
  const { logAction, logBulkAction } = useAuditLog();

  // Log a single action
  const handleRoleAssign = async (userId: string, role: string) => {
    // ... perform action ...
    
    await logAction(
      'user.role.assign',           // action type
      'user',                        // target type
      userId,                        // target ID
      userEmail,                     // target identifier
      { role, assigned: true },      // changes
      organizationId                 // organization context (optional)
    );
  };

  // Log a bulk operation
  const handleBulkImport = async (users: User[]) => {
    // ... perform import ...
    
    await logBulkAction(
      'bulk.users.import',
      'user',
      {
        totalItems: users.length,
        successCount: 45,
        failureCount: 5,
        details: 'CSV import via admin panel'
      },
      organizationId
    );
  };
}
```

### Querying Logs (Frontend)

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch logs for a specific user
const { data: logs } = useQuery({
  queryKey: ['user-activity', userId],
  queryFn: async () => {
    const { data } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('actor_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    return data;
  },
});

// Fetch logs with filters
const { data: filteredLogs } = useQuery({
  queryKey: ['audit-logs', filters],
  queryFn: async () => {
    let query = supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (dateFrom && dateTo) {
      query = query
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);
    }

    if (actionType) {
      query = query.eq('action_type', actionType);
    }

    const { data } = await query.limit(500);
    return data;
  },
});
```

---

## Performance Considerations

### Database Indexes
The following indexes are created for optimal performance:
- `idx_admin_audit_logs_actor_id`: Query by actor
- `idx_admin_audit_logs_action_type`: Filter by action type
- `idx_admin_audit_logs_organization_id`: Organization-specific queries
- `idx_admin_audit_logs_created_at`: Time-based queries
- `idx_admin_audit_logs_org_created`: Composite index for org + time
- `idx_admin_audit_logs_action_category`: Category filtering

### Query Optimization Tips
1. **Use date range filters**: Always limit queries to specific time ranges
2. **Limit result sets**: Use `.limit()` to prevent large data transfers
3. **Leverage indexes**: Filter by indexed columns (actor_id, action_type, created_at)
4. **Avoid full table scans**: Don't query without any filters on large tables

### Monitoring Performance
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'admin_audit_logs'
ORDER BY idx_scan DESC;

-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('admin_audit_logs'));
```

---

## Troubleshooting

### Common Issues

**Issue**: Audit log not created
- **Cause**: Missing required fields (actor_id, actor_email, action_type)
- **Solution**: Ensure all required fields are provided in `logAction` call
- **Check**: Console logs for validation errors

**Issue**: Cannot view audit logs
- **Cause**: User is not a super_admin
- **Solution**: Verify user role in database: `SELECT role FROM user_roles WHERE user_id = '<user_id>'`

**Issue**: Slow audit log queries
- **Cause**: Missing date range filter, too many results
- **Solution**: Always filter by date range, use pagination

**Issue**: "Cannot update/delete audit log" error
- **Cause**: Attempting to modify immutable audit log
- **Solution**: This is expected behavior - audit logs cannot be modified

---

## Best Practices

1. **Always log significant actions**: Any action that affects users, organizations, or security should be logged
2. **Include context**: Provide meaningful `target_identifier` (email, name) not just IDs
3. **Log before and after**: Include both old and new values in the `changes` object
4. **Handle failures gracefully**: Audit logging should never break main operations
5. **Regular monitoring**: Review audit logs weekly for suspicious patterns
6. **Document custom actions**: If you add new action types, update this documentation
7. **Test logging**: Verify audit logs are created for all new features
8. **Protect the logs**: Never expose audit log access to non-admin users
9. **Archive old logs**: Implement an archival process for logs older than your retention period
10. **Review compliance**: Periodically review audit logs against compliance requirements

---

## Support & Contact

For questions about audit logging:
- Review this documentation
- Check the implementation in `src/hooks/useAuditLog.ts`
- Examine database schema in Supabase dashboard
- Review RLS policies in `supabase/migrations/`

---

**Last Updated**: 2025-11-04
**Version**: 1.0.0
