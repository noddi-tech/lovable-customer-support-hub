# Plan: Add User Activity Logging for Login Times, Actions, and Session History

## Overview

Implement comprehensive user activity tracking to monitor login times, actions performed, and session history. This builds upon the existing audit logging system (`admin_audit_logs`) and adds a new dedicated table for session/activity tracking.

## Current State Analysis

### What Already Exists
1. **admin_audit_logs table** - Tracks administrative actions (user management, org changes, etc.)
2. **useAuditLog hook** - Logs admin actions from the frontend
3. **useUserActivity hook** - Queries admin_audit_logs for a specific user's actions
4. **UserActivityTimeline component** - Displays user's admin actions in a timeline
5. **auth.users.last_sign_in_at** - Supabase tracks last login time (but no history)
6. **AuthContext** - Already has `onAuthStateChange` listener for SIGNED_IN events

### What's Missing
1. **Session history** - No table to track individual login sessions
2. **Login event logging** - SIGNED_IN events aren't persisted
3. **Session duration tracking** - No tracking of how long users stay logged in
4. **Page/feature usage tracking** - No tracking of what features users access
5. **Activity summary view** - No dashboard showing login patterns

## Implementation Plan

### Phase 1: Database Schema

#### 1.1 Create user_sessions table
```sql
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  
  -- Session timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  -- Session metadata
  session_type TEXT NOT NULL DEFAULT 'login', -- 'login', 'token_refresh', 'sso'
  user_agent TEXT,
  ip_address INET,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  end_reason TEXT, -- 'logout', 'timeout', 'session_replaced', 'forced'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_started_at ON public.user_sessions(started_at DESC);
CREATE INDEX idx_user_sessions_organization_id ON public.user_sessions(organization_id);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = TRUE;
```

#### 1.2 Create user_activity_events table
```sql
CREATE TABLE public.user_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.user_sessions(id),
  email TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  
  -- Event details
  event_type TEXT NOT NULL, -- 'page_view', 'feature_use', 'action', 'search'
  event_name TEXT NOT NULL, -- 'conversations.view', 'inbox.select', 'message.send', etc.
  event_data JSONB DEFAULT '{}',
  
  -- Context
  page_path TEXT,
  component TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_activity_events_user_id ON public.user_activity_events(user_id);
CREATE INDEX idx_user_activity_events_created_at ON public.user_activity_events(created_at DESC);
CREATE INDEX idx_user_activity_events_event_type ON public.user_activity_events(event_type);
CREATE INDEX idx_user_activity_events_session_id ON public.user_activity_events(session_id);
```

#### 1.3 Add RLS policies
```sql
-- user_sessions: Users can view their own, admins can view all in their org
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view org sessions"
  ON public.user_sessions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can insert own sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Similar policies for user_activity_events
ALTER TABLE public.user_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON public.user_activity_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view org activity"
  ON public.user_activity_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can insert own activity"
  ON public.user_activity_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Phase 2: Frontend Hooks

#### 2.1 Create useSessionTracking hook
**File: `src/hooks/useSessionTracking.ts`**

```typescript
// Tracks session start/end and heartbeat for activity
// - Creates session record on SIGNED_IN
// - Updates last_active_at periodically (every 5 min)
// - Ends session on SIGNED_OUT or window close
```

Key features:
- Listen to `onAuthStateChange` for SIGNED_IN/SIGNED_OUT events
- Parse user-agent for device/browser info
- Heartbeat to update `last_active_at`
- Handle browser close via `beforeunload` event
- Store current session_id in state for activity tracking

#### 2.2 Create useActivityTracking hook
**File: `src/hooks/useActivityTracking.ts`**

```typescript
// Provides trackEvent function for logging user actions
// - Batches events to reduce DB writes
// - Automatically includes session context
// - Debounces rapid events
```

Key features:
- `trackEvent(type, name, data?)` function
- Batch events and flush every 30 seconds or on navigation
- Include page path and component context
- Queue events if offline, sync when online

#### 2.3 Extend useAuditLog for session actions
Add new action types:
```typescript
export type AuditAction = 
  // ... existing actions
  | 'session.login'
  | 'session.logout'
  | 'session.timeout'
  | 'session.refresh';
```

### Phase 3: Activity Tracking Integration

#### 3.1 Create SessionTrackingProvider
**File: `src/components/auth/SessionTrackingProvider.tsx`**

Wrap the app with a provider that:
- Initializes session tracking on mount
- Provides activity tracking context to children
- Handles cleanup on unmount

#### 3.2 Integrate with AuthContext
Modify `src/components/auth/AuthContext.tsx` to:
- Create session record when `event === 'SIGNED_IN'`
- End session record when signing out
- Store session ID in context

#### 3.3 Add automatic page view tracking
Create a route change listener that logs:
- Page path
- Time spent on previous page
- Navigation source (link click, direct, back button)

### Phase 4: UI Components

#### 4.1 Enhance UserActivityTimeline
Update to show:
- Login sessions with duration
- Feature usage breakdown
- Activity heatmap by hour/day

#### 4.2 Create SessionHistoryTable component
**File: `src/components/admin/SessionHistoryTable.tsx`**

Display columns:
- Login time
- Duration / Active status
- Device / Browser
- IP Address (if tracked)
- End reason

#### 4.3 Create ActivityAnalytics dashboard
**File: `src/pages/UserActivityAnalytics.tsx`**

Features:
- Login frequency chart
- Active hours heatmap
- Feature usage breakdown
- Session duration statistics
- User engagement metrics

### Phase 5: Admin Features

#### 5.1 Add "Never Logged In" filter to AllUsersManagement
Use `auth.users.last_sign_in_at IS NULL` to identify users who:
- Were invited but never signed up
- Created but never activated

#### 5.2 Add user engagement indicators
Show on user cards:
- Last login time
- Total sessions
- Average session duration
- Activity level (active/inactive/dormant)

#### 5.3 Create inactivity alerts
Add functionality to:
- Identify users inactive for X days
- Option to send reminder emails
- Auto-suspend after extended inactivity (optional)

## Files to Create/Modify

### New Files
1. `supabase/migrations/[timestamp]_create_user_sessions_tables.sql` - Database schema
2. `src/hooks/useSessionTracking.ts` - Session tracking hook
3. `src/hooks/useActivityTracking.ts` - Activity event tracking hook
4. `src/components/auth/SessionTrackingProvider.tsx` - Context provider
5. `src/components/admin/SessionHistoryTable.tsx` - Session history UI
6. `src/pages/UserActivityAnalytics.tsx` - Analytics dashboard

### Modified Files
1. `src/components/auth/AuthContext.tsx` - Add session creation on login
2. `src/hooks/useAuditLog.ts` - Add session action types
3. `src/hooks/useUserActivity.ts` - Include session data
4. `src/components/admin/UserActivityTimeline.tsx` - Show login history
5. `src/pages/AllUsersManagement.tsx` - Add "never logged in" filter
6. `src/integrations/supabase/types.ts` - Add new table types
7. `src/App.tsx` - Wrap with SessionTrackingProvider

## Critical Files for Implementation

1. **`supabase/migrations/[timestamp]_create_user_sessions_tables.sql`** - Database foundation
2. **`src/components/auth/AuthContext.tsx`** - Core auth events to hook into
3. **`src/hooks/useSessionTracking.ts`** - Session lifecycle management
4. **`src/hooks/useAuditLog.ts`** - Existing pattern to follow for logging
5. **`src/pages/AllUsersManagement.tsx`** - Integration point for admin features

## Implementation Order

1. Database migration (tables + RLS policies)
2. TypeScript types update
3. useSessionTracking hook
4. AuthContext integration
5. useActivityTracking hook
6. SessionTrackingProvider
7. SessionHistoryTable component
8. UserActivityTimeline enhancements
9. Analytics dashboard
10. Admin features (filters, alerts)

## Testing Checklist

- [ ] Session created on login
- [ ] Session updated on activity heartbeat
- [ ] Session ended on logout
- [ ] Session ended on browser close
- [ ] Activity events logged correctly
- [ ] RLS policies working (users see only their data)
- [ ] Admins can view org-wide data
- [ ] Analytics calculations accurate
- [ ] Performance acceptable with many events
