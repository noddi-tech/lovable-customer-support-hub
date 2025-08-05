-- Add assigned_to_id field to messages table for internal note assignments
ALTER TABLE public.messages 
ADD COLUMN assigned_to_id uuid REFERENCES public.profiles(user_id);

-- Add index for better performance when querying assigned messages
CREATE INDEX idx_messages_assigned_to ON public.messages(assigned_to_id) WHERE assigned_to_id IS NOT NULL;

-- Add index for internal notes for better performance
CREATE INDEX idx_messages_internal ON public.messages(is_internal) WHERE is_internal = true;