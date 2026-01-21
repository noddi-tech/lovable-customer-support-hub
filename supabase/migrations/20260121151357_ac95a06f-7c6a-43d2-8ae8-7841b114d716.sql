-- Create table for active live chat sessions
CREATE TABLE widget_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  widget_config_id UUID REFERENCES widget_configs(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' 
    CHECK (status IN ('waiting', 'active', 'ended', 'abandoned')),
  assigned_agent_id UUID REFERENCES profiles(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_chat_sessions_visitor ON widget_chat_sessions(visitor_id);
CREATE INDEX idx_chat_sessions_status ON widget_chat_sessions(status) WHERE status != 'ended';
CREATE INDEX idx_chat_sessions_agent ON widget_chat_sessions(assigned_agent_id);
CREATE INDEX idx_chat_sessions_conversation ON widget_chat_sessions(conversation_id);

-- Enable realtime for live updates
ALTER TABLE widget_chat_sessions REPLICA IDENTITY FULL;

-- RLS policies
ALTER TABLE widget_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role has full access to chat sessions"
ON widget_chat_sessions FOR ALL
USING (true)
WITH CHECK (true);

-- Create typing indicators table
CREATE TABLE chat_typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id), -- NULL for visitors
  visitor_id TEXT,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_typing UNIQUE(conversation_id, user_id),
  CONSTRAINT unique_visitor_typing UNIQUE(conversation_id, visitor_id)
);

ALTER TABLE chat_typing_indicators REPLICA IDENTITY FULL;
ALTER TABLE chat_typing_indicators ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role has full access to typing indicators"
ON chat_typing_indicators FOR ALL
USING (true)
WITH CHECK (true);

-- Update timestamp function for chat sessions
CREATE OR REPLACE FUNCTION update_chat_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON widget_chat_sessions
FOR EACH ROW
EXECUTE FUNCTION update_chat_session_updated_at();