-- Add auto_send_transcript setting to widget_configs
ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS auto_send_transcript boolean DEFAULT false;

-- Add column comment
COMMENT ON COLUMN widget_configs.auto_send_transcript IS 'When true, automatically send chat transcript to visitor email when chat ends';