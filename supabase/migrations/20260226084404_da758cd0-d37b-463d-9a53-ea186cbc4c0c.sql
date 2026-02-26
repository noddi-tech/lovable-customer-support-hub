-- Add 'mention' to enabled_events for all active Slack integrations that don't already have it
UPDATE slack_integrations
SET configuration = jsonb_set(
  COALESCE(configuration, '{}')::jsonb,
  '{enabled_events}',
  COALESCE((configuration->'enabled_events')::jsonb, '[]'::jsonb) || '["mention"]'::jsonb
)
WHERE is_active = true
  AND (
    configuration IS NULL 
    OR NOT COALESCE((configuration->'enabled_events')::jsonb, '[]'::jsonb) @> '["mention"]'::jsonb
  );