-- Change sync_interval_minutes from integer to numeric to support decimal values
ALTER TABLE public.email_accounts 
ALTER COLUMN sync_interval_minutes TYPE numeric(10,3);