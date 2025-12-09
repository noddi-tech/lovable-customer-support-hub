-- Add customers and internal_events tables to supabase_realtime publication
-- This ensures real-time events are broadcast for these tables

-- First check if tables are already in publication and add if not
DO $$
BEGIN
  -- Add customers table if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'customers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE customers;
  END IF;
  
  -- Add internal_events table if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'internal_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE internal_events;
  END IF;
END $$;