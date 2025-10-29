-- Add is_internal column to messages table for internal notes feature
-- This allows agents to leave notes that are only visible to team members

DO $$ 
BEGIN
  -- Check if column doesn't exist before adding it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'is_internal'
  ) THEN
    ALTER TABLE public.messages 
    ADD COLUMN is_internal BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN public.messages.is_internal IS 'Indicates if this message is an internal note (only visible to agents)';
  END IF;
END $$;

-- Update RLS policies to ensure customers never see internal notes
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Agents can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Agents can insert messages" ON public.messages;

-- Recreate policies with internal notes protection
-- Customers can only view non-internal messages
CREATE POLICY "Customers can view non-internal messages in their conversations"
ON public.messages
FOR SELECT
USING (
  is_internal = false 
  AND EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.customer_id = auth.uid()
  )
);

-- Agents can view ALL messages (including internal notes)
CREATE POLICY "Agents can view all messages including internal notes"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('agent', 'admin', 'super_admin')
  )
);

-- Agents can insert messages (both internal and customer-facing)
CREATE POLICY "Agents can insert all message types"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('agent', 'admin', 'super_admin')
  )
);

-- Agents can update their own messages
CREATE POLICY "Agents can update their own messages"
ON public.messages
FOR UPDATE
USING (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('agent', 'admin', 'super_admin')
  )
);

-- Create index for faster queries on is_internal
CREATE INDEX IF NOT EXISTS idx_messages_is_internal ON public.messages(is_internal);
