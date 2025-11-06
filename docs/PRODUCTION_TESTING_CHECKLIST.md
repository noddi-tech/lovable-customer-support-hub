# Production Testing Checklist for support.noddi.co

## Pre-Deployment Verification

### Configuration Review
- [ ] Verify `supabase/config.toml` has only production URLs in `additional_redirect_urls`
- [ ] Confirm `dev-login` function is disabled or removed
- [ ] Check all environment variables are set in Supabase Edge Functions settings
- [ ] Verify Aircall domain in `voice_integrations` table is set to `support.noddi.co`

---

## 1. Authentication & Authorization Testing

### User Authentication
- [ ] **Sign Up Flow**
  - Navigate to `/auth`
  - Create new account with email/password
  - Verify email confirmation (if enabled)
  - Check user appears in Supabase Auth dashboard
  
- [ ] **Sign In Flow**
  - Sign in with test credentials
  - Verify successful redirect to dashboard
  - Check session persistence on page refresh
  
- [ ] **Sign Out Flow**
  - Click sign out button
  - Verify redirect to auth page
  - Confirm session is cleared (check browser storage)

### Authorization & Roles
- [ ] **Super Admin Access**
  - Verify access to Admin Portal (`/admin`)
  - Check audit logs page loads
  - Test user management functions
  
- [ ] **Admin Access**
  - Verify organization settings access
  - Check integration management
  - Test department management
  
- [ ] **Agent Access**
  - Verify inbox access
  - Check conversation management
  - Test AI suggestion features
  
- [ ] **User Access**
  - Verify limited dashboard access
  - Check profile settings work
  - Confirm restricted admin features

### Row Level Security (RLS)
- [ ] Test users can only see their organization's data
- [ ] Verify users cannot access other organizations' conversations
- [ ] Check service tickets are properly scoped
- [ ] Test audit logs are only visible to super admins

---

## 2. Voice Integration Testing (Aircall)

### Aircall Configuration
- [ ] **Admin Settings**
  - Navigate to Admin → Integrations → Voice
  - Verify Aircall credentials are set (masked)
  - Click "Test Connection" - should succeed
  - Check webhook token is generated

### Aircall Everywhere SDK
- [ ] **SDK Initialization**
  - Login as agent user
  - Navigate to inbox
  - Verify Aircall SDK loads (check console for initialization logs)
  - Check for cookie/domain warnings (should be none)
  
- [ ] **Phone Interface**
  - Verify phone dialer appears
  - Test making an outbound call
  - Check call controls (mute, hold, transfer)
  - Verify call status updates in real-time

### Call Event Webhooks
- [ ] **Inbound Call**
  - Receive inbound call from Aircall number
  - Verify webhook creates `call_events` record
  - Check conversation is created or updated
  - Verify customer lookup by phone number works
  
- [ ] **Outbound Call**
  - Make outbound call via Aircall
  - Verify webhook captures call data
  - Check call is linked to correct conversation
  
- [ ] **Call Completion**
  - Complete a call
  - Verify `ended_at` timestamp is recorded
  - Check call duration is calculated
  - Verify voicemail download link (if applicable)

### Voicemail Testing
- [ ] Leave voicemail on Aircall number
- [ ] Verify voicemail event recorded in database
- [ ] Test voicemail download via edge function (`/download-voicemail`)
- [ ] Check audio file downloads correctly

### Noddi API Integration
- [ ] **Customer Lookup**
  - Receive call from known customer
  - Verify `noddi-search-by-name` function called
  - Check customer data appears in conversation
  - Test booking information displays
  
- [ ] **Manual Search**
  - Use search functionality in conversation
  - Enter customer phone/email
  - Verify Noddi API returns correct data
  - Check bookings display properly

---

## 3. Email Integration Testing (SendGrid)

### Inbound Email Processing
- [ ] **SendGrid Webhook Configuration**
  - Verify webhook URL in SendGrid: `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/sendgrid-inbound`
  - Check webhook is active and receiving events
  
- [ ] **Email Reception**
  - Send test email to configured SendGrid address
  - Verify email creates conversation in database
  - Check email content is properly parsed
  - Verify attachments are stored (if applicable)
  
- [ ] **Email Threading**
  - Reply to existing email conversation
  - Verify reply is threaded to correct conversation
  - Check `In-Reply-To` and `References` headers work

### Email Sender Identity
- [ ] Verify sender domain is authenticated in SendGrid
- [ ] Check DKIM, SPF, and DMARC records
- [ ] Send test email and verify it doesn't go to spam

---

## 4. Service Ticket System Testing

### Ticket Creation
- [ ] **From Conversation**
  - Open conversation
  - Click "Create Service Ticket"
  - Fill in ticket details
  - Verify ticket number generated (format: ST-XXXXXX)
  - Check ticket appears in tickets list
  
- [ ] **Direct Creation**
  - Navigate to Service Tickets page
  - Click "Create New Ticket"
  - Fill in details
  - Verify ticket created successfully

### Ticket Management
- [ ] **Status Changes**
  - Update ticket status
  - Verify event logged in `service_ticket_events`
  - Check notification sent to assigned user
  
- [ ] **Assignment**
  - Assign ticket to user
  - Verify assignment event logged
  - Check assigned user receives notification
  
- [ ] **Comments**
  - Add comment to ticket
  - Verify comment appears in timeline
  - Check notification sent to watchers
  
- [ ] **Priority Changes**
  - Update ticket priority
  - Verify priority event logged
  - Check UI reflects new priority

### Ticket Notifications
- [ ] Verify email notifications sent via edge function
- [ ] Check in-app notifications appear
- [ ] Test browser notifications (if enabled)
- [ ] Verify notification preferences respected

---

## 5. Knowledge Base & AI Features Testing

### AI Suggestions
- [ ] **Generate Suggestions**
  - Open conversation
  - Click "Suggest Replies"
  - Verify AI suggestions appear
  - Check suggestions are relevant
  
- [ ] **Use Suggestion**
  - Select an AI suggestion
  - Send message
  - Verify `response_tracking` record created
  - Check `used_suggestion` is true

### Knowledge Base
- [ ] **Search Knowledge**
  - Use knowledge base search
  - Verify vector search returns relevant results
  - Check search results are ranked properly
  
- [ ] **Auto-Promotion**
  - Submit positive feedback on AI suggestion
  - Verify auto-promotion logic runs
  - Check knowledge entry created if eligible
  - Verify quality score calculated

### Feedback System
- [ ] **Submit Feedback**
  - Use AI suggestion
  - Submit thumbs up/down feedback
  - Verify feedback recorded in `response_tracking`
  - Check feedback appears in admin analytics

---

## 6. Real-time Features Testing

### Live Updates
- [ ] **Conversations**
  - Open conversation in two browser tabs
  - Send message from one tab
  - Verify other tab updates in real-time
  
- [ ] **Service Tickets**
  - Open ticket in two tabs
  - Update status in one tab
  - Verify other tab reflects change
  
- [ ] **Notifications**
  - Trigger notification event
  - Verify notification appears without refresh
  - Check notification count updates

---

## 7. Edge Functions Testing

### Authentication Required Functions
- [ ] `download-voicemail` - requires valid JWT
- [ ] `test-aircall-credentials` - requires admin role
- [ ] `manual-end-call` - requires agent role
- [ ] `suggest-replies` - requires authenticated user
- [ ] `track-outcome` - requires authenticated user
- [ ] `create-service-ticket` - requires authenticated user

### Public Webhook Functions
- [ ] `call-events-webhook` - validates Aircall token
- [ ] `sendgrid-inbound` - validates SendGrid signature

### Test Execution
For each function:
- [ ] Verify function deploys successfully
- [ ] Check function logs for errors
- [ ] Test with valid input
- [ ] Test with invalid input (error handling)
- [ ] Verify response format is correct

---

## 8. Analytics & Reporting Testing

### Audit Logs
- [ ] **Log Generation**
  - Perform admin action (create user, update org)
  - Verify audit log created
  - Check all required fields populated
  
- [ ] **Log Viewing**
  - Navigate to Audit Logs page
  - Verify logs display correctly
  - Test filtering and search
  - Test date range filtering
  
- [ ] **CSV Export**
  - Export audit logs to CSV
  - Verify file downloads
  - Check data completeness

### Knowledge Analytics
- [ ] Navigate to Knowledge Management page
- [ ] Verify metrics display (usage, effectiveness)
- [ ] Check performance charts render
- [ ] Test system health indicators

---

## 9. Performance Testing

### Page Load Times
- [ ] Dashboard loads in < 3 seconds
- [ ] Inbox loads conversations in < 2 seconds
- [ ] Service tickets page loads in < 2 seconds
- [ ] Admin pages load in < 3 seconds

### API Response Times
- [ ] Conversation list API < 500ms
- [ ] AI suggestion generation < 5 seconds
- [ ] Knowledge base search < 1 second
- [ ] Customer lookup (Noddi API) < 2 seconds

### Concurrent Users
- [ ] Test with 5 simultaneous users
- [ ] Test with 10 simultaneous users
- [ ] Monitor Supabase connection pool
- [ ] Check for database deadlocks

---

## 10. Security Testing

### Authentication Security
- [ ] Verify JWT tokens expire correctly
- [ ] Test password reset flow
- [ ] Check for session fixation vulnerabilities
- [ ] Test CSRF protection

### Authorization Security
- [ ] Attempt to access admin pages as regular user (should fail)
- [ ] Try to view other organization's data (should fail)
- [ ] Test API endpoints without authentication (should fail)
- [ ] Verify RLS policies prevent unauthorized access

### Data Security
- [ ] Check sensitive data is encrypted at rest
- [ ] Verify API keys are not exposed in frontend
- [ ] Test SQL injection prevention
- [ ] Check XSS protection in user inputs

---

## 11. Integration Error Handling

### Aircall Errors
- [ ] Test with invalid Aircall credentials
- [ ] Simulate Aircall API timeout
- [ ] Test with missing webhook token
- [ ] Verify graceful degradation

### SendGrid Errors
- [ ] Test with malformed email
- [ ] Simulate SendGrid webhook failure
- [ ] Test with missing sender identity
- [ ] Verify error logging

### Noddi API Errors
- [ ] Test with invalid customer ID
- [ ] Simulate Noddi API timeout
- [ ] Test with missing API credentials
- [ ] Verify fallback behavior

---

## 12. Mobile Responsiveness

### Layout Testing
- [ ] Test on mobile device (phone)
- [ ] Test on tablet
- [ ] Verify navigation menu works
- [ ] Check forms are usable on mobile

### Touch Interactions
- [ ] Test swipe gestures (if applicable)
- [ ] Verify buttons are touch-friendly
- [ ] Check dropdown menus work
- [ ] Test modal dialogs on mobile

---

## 13. Browser Compatibility

### Chrome/Edge
- [ ] Full functionality works
- [ ] Aircall SDK loads correctly
- [ ] Third-party cookies detected

### Firefox
- [ ] Full functionality works
- [ ] Aircall SDK loads correctly
- [ ] Cookie warnings handled

### Safari
- [ ] Full functionality works
- [ ] Aircall SDK initialization tested
- [ ] ITP (Intelligent Tracking Prevention) handled

---

## 14. Data Migration & Integrity

### Database Checks
- [ ] Verify all migrations applied successfully
- [ ] Check for orphaned records
- [ ] Test foreign key constraints
- [ ] Verify indexes are created

### Data Consistency
- [ ] Check conversation message counts
- [ ] Verify call event totals
- [ ] Test service ticket numbering sequence
- [ ] Check knowledge base embeddings

---

## Production Deployment Checklist

### Pre-Deployment
- [ ] Run database linter (`supabase db lint`)
- [ ] Review all security scan results
- [ ] Backup production database
- [ ] Document current version/state

### Deployment
- [ ] Apply database migrations
- [ ] Deploy edge functions
- [ ] Update frontend code
- [ ] Clear CDN cache (if applicable)

### Post-Deployment
- [ ] Run smoke tests (critical paths)
- [ ] Monitor error logs for 1 hour
- [ ] Check Supabase dashboard for errors
- [ ] Verify real-time subscriptions working
- [ ] Test critical integrations (Aircall, SendGrid)

### Rollback Plan
- [ ] Document rollback procedure
- [ ] Keep previous version accessible
- [ ] Have database backup ready
- [ ] Test rollback in staging first

---

## Monitoring & Alerts

### Set Up Monitoring
- [ ] Configure Supabase alerts for edge function errors
- [ ] Set up uptime monitoring (e.g., UptimeRobot)
- [ ] Enable error tracking (e.g., Sentry)
- [ ] Monitor database performance metrics

### Daily Checks
- [ ] Review edge function logs
- [ ] Check error rates in Supabase dashboard
- [ ] Monitor API usage and quotas
- [ ] Verify scheduled jobs running (auto-promotion, etc.)

---

## Sign-Off

### Testing Completion
- [ ] All critical tests passed
- [ ] Known issues documented
- [ ] Performance benchmarks met
- [ ] Security review completed

### Stakeholder Approval
- [ ] Technical lead sign-off: _________________ Date: _______
- [ ] Product owner sign-off: _________________ Date: _______
- [ ] Security review sign-off: _________________ Date: _______

---

## Notes & Issues

Document any issues found during testing:

| Issue | Severity | Description | Status | Notes |
|-------|----------|-------------|--------|-------|
|       |          |             |        |       |
|       |          |             |        |       |

---

## Quick Reference URLs

- **Production App**: https://support.noddi.co
- **Supabase Dashboard**: https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup
- **Edge Functions**: https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/functions
- **Database**: https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/editor
- **Auth Users**: https://supabase.com/dashboard/project/qgfaycwsangsqzpveoup/auth/users
- **SendGrid Dashboard**: https://app.sendgrid.com
- **Aircall Dashboard**: https://dashboard.aircall.io
