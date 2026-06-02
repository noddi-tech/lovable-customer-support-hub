ALTER TABLE public.recruitment_automation_rules 
DROP CONSTRAINT IF EXISTS recruitment_automation_rules_action_type_check;

ALTER TABLE public.recruitment_automation_rules
ADD CONSTRAINT recruitment_automation_rules_action_type_check
CHECK (action_type = ANY (ARRAY[
  'send_email'::text,
  'send_sms'::text,
  'assign_to'::text,
  'create_task'::text,
  'webhook'::text,
  'send_candidate_form'::text
]));