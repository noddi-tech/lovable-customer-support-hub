-- Set REPLICA IDENTITY FULL to ensure complete row data is captured during updates
-- This is needed for optimal real-time functionality
ALTER TABLE public.calls REPLICA IDENTITY FULL;
ALTER TABLE public.call_events REPLICA IDENTITY FULL;
ALTER TABLE public.internal_events REPLICA IDENTITY FULL;