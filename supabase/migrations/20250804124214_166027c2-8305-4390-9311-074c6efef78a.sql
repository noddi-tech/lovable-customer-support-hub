-- Update the email account to use the webhook URL instead of an email address
UPDATE email_accounts 
SET forwarding_address = 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/email-webhook'
WHERE email_address = 'joachim@noddi.no';