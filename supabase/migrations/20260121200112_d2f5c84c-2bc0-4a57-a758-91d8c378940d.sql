-- Add agent chat availability tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS chat_availability TEXT 
  DEFAULT 'offline' CHECK (chat_availability IN ('online', 'away', 'offline'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS chat_availability_updated_at TIMESTAMPTZ DEFAULT now();

-- Index for quick lookups of online agents
CREATE INDEX IF NOT EXISTS idx_profiles_chat_availability 
  ON profiles(chat_availability) WHERE chat_availability = 'online';

-- Function to get online agent count for an organization
CREATE OR REPLACE FUNCTION get_online_agent_count(org_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM profiles p
  JOIN organization_memberships om ON om.user_id = p.user_id
  WHERE om.organization_id = org_id
    AND om.status = 'active'
    AND p.chat_availability = 'online';
$$ LANGUAGE sql STABLE SECURITY DEFINER;