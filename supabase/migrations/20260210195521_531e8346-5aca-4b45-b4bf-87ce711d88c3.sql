ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS ai_flow_config JSONB DEFAULT NULL;

COMMENT ON COLUMN widget_configs.ai_flow_config IS 
  'JSON configuration for AI assistant conversation flow. When set, overrides default hardcoded flow.';