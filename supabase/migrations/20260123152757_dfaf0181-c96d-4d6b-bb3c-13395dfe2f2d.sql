-- Note Templates table for quick internal note insertion
CREATE TABLE public.note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  icon TEXT DEFAULT 'sticky-note',
  color TEXT DEFAULT 'yellow',
  shortcut TEXT, -- e.g., "esc", "vip", "cb" for quick insertion
  is_global BOOLEAN DEFAULT true, -- Available to all in org
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add is_pinned column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Index for quick pinned note queries
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON messages (conversation_id, is_pinned) WHERE is_pinned = true;

-- Enable RLS on note_templates
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for note_templates
CREATE POLICY "Users can view note templates in their organization"
  ON public.note_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create note templates in their organization"
  ON public.note_templates FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update note templates they created or global ones in their org"
  ON public.note_templates FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
    AND (created_by = auth.uid() OR is_global = true)
  );

CREATE POLICY "Users can delete note templates they created"
  ON public.note_templates FOR DELETE
  USING (
    created_by = auth.uid() OR 
    -- Admins can delete any in their org
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND organization_id = note_templates.organization_id 
      AND role = 'admin'
    )
  );

-- Seed default note templates
INSERT INTO public.note_templates (organization_id, name, content, icon, color, shortcut, is_global)
SELECT 
  o.id,
  t.name,
  t.content,
  t.icon,
  t.color,
  t.shortcut,
  true
FROM organizations o
CROSS JOIN (VALUES
  ('Escalated', 'Escalated to {{team/person}} - Reason: {{reason}}', 'arrow-up-circle', 'red', 'esc'),
  ('VIP Customer', '⭐ VIP customer - Priority handling required', 'star', 'gold', 'vip'),
  ('Callback Requested', '📞 Customer requested callback at {{time}}', 'phone', 'blue', 'cb'),
  ('Waiting for Response', '⏳ Waiting for customer response', 'clock', 'gray', 'wait'),
  ('Follow-up Needed', '📅 Follow-up needed by {{date}}', 'calendar', 'purple', 'follow'),
  ('Technical Issue', '🔧 Technical issue - Investigating...', 'wrench', 'orange', 'tech')
) AS t(name, content, icon, color, shortcut)
ON CONFLICT DO NOTHING;