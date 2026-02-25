-- Fix email_status on 2 agent replies that were never sent (mark as failed so resend button is visible)
UPDATE messages 
SET email_status = 'failed'
WHERE id IN (
  'bbee134d-6293-4064-9df0-f73488a76f64',
  '1c25ddb4-95b9-423c-abd0-f44597ecc6f8'
) AND email_status = 'pending';