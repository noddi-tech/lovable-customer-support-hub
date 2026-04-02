-- Fix internal notes: clear false 'pending' email_status
UPDATE messages SET email_status = NULL WHERE is_internal = true AND email_status = 'pending';

-- Fix stuck agent replies older than 5 minutes: mark as failed
UPDATE messages SET email_status = 'failed' WHERE sender_type = 'agent' AND (is_internal = false OR is_internal IS NULL) AND email_status = 'pending' AND created_at < NOW() - INTERVAL '5 minutes';