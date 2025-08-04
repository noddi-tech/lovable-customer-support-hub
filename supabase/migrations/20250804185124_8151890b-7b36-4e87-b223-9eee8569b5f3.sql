-- Update stuck messages from 'sending' to 'failed' status
UPDATE messages 
SET email_status = 'failed' 
WHERE email_status = 'sending' 
AND created_at < NOW() - INTERVAL '1 minute';