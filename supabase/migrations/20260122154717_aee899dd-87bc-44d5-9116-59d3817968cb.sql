-- Add per-language translation columns to widget_configs
ALTER TABLE widget_configs 
ADD COLUMN IF NOT EXISTS greeting_translations JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS response_time_translations JSONB DEFAULT '{}';