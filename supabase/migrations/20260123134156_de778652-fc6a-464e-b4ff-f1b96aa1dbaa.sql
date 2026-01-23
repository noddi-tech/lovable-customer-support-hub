-- Add dismissal message columns to widget_configs
ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS dismissal_message_text text 
  DEFAULT 'Due to high demand, we can''t connect you with an agent right now. We''ll follow up with you via email shortly.',
ADD COLUMN IF NOT EXISTS dismissal_message_translations jsonb DEFAULT '{}';