-- Enable real-time for calls table (call_events is already enabled)
ALTER TABLE public.calls REPLICA IDENTITY FULL;

-- Check if calls table is already in the publication, if not add it
DO $$
BEGIN
  -- Try to add the table to the publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
  EXCEPTION WHEN duplicate_object THEN
    -- Table is already in the publication, which is fine
    NULL;
  END;
END $$;