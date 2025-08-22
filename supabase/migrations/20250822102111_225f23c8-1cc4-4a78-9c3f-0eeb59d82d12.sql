-- Performance indexes for critical queries
-- These indexes will dramatically improve query performance for frequently accessed data

-- Conversations table indexes
CREATE INDEX IF NOT EXISTS idx_conversations_organization_status 
ON conversations(organization_id, status) 
WHERE NOT is_archived;

CREATE INDEX IF NOT EXISTS idx_conversations_organization_updated 
ON conversations(organization_id, updated_at DESC) 
WHERE NOT is_archived;

CREATE INDEX IF NOT EXISTS idx_conversations_department_status 
ON conversations(department_id, status) 
WHERE department_id IS NOT NULL AND NOT is_archived;

-- Messages table indexes  
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_type 
ON messages(conversation_id, sender_type);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read, created_at DESC) 
WHERE NOT is_read;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_organization_active 
ON profiles(organization_id, is_active) 
WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles(user_id);

-- Calls table indexes
CREATE INDEX IF NOT EXISTS idx_calls_organization_started 
ON calls(organization_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_calls_status_organization 
ON calls(status, organization_id);

CREATE INDEX IF NOT EXISTS idx_calls_customer_phone 
ON calls(customer_phone) 
WHERE customer_phone IS NOT NULL;