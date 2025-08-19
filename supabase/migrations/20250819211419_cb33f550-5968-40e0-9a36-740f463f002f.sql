-- Update the branch name in webhook event mappings to match Aircall configuration
UPDATE public.webhook_event_mappings 
SET condition_rules = jsonb_set(
  condition_rules, 
  '{ivr_options,branch}', 
  '"callback_requested"'::jsonb
)
WHERE provider = 'aircall' 
  AND external_event = 'call.ivr_option_selected' 
  AND internal_event_type = 'callback_requested';