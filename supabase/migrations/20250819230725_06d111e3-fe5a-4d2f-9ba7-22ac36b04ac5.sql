-- Add assigned_to_id field to internal_events table for voicemail and callback assignment
ALTER TABLE public.internal_events 
ADD COLUMN assigned_to_id UUID REFERENCES auth.users(id);

-- Add index for better performance on assignment queries
CREATE INDEX idx_internal_events_assigned_to_id ON public.internal_events(assigned_to_id);

-- Add index for filtering by assignment and status
CREATE INDEX idx_internal_events_assignment_status ON public.internal_events(assigned_to_id, status, event_type);