-- Enable real-time functionality for voice interface tables
-- This ensures all changes to calls, call_events, and internal_events are broadcasted in real-time

-- Set REPLICA IDENTITY FULL to capture complete row data during updates
ALTER TABLE public.calls REPLICA IDENTITY FULL;
ALTER TABLE public.call_events REPLICA IDENTITY FULL;
ALTER TABLE public.internal_events REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication to activate real-time functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_events;