-- Fix service_tickets schema issues
-- 1. Align enum with TypeScript (use 'completed' instead of 'resolved')
-- 2. Fix attachment file_size column name

-- First, drop the default constraint
ALTER TABLE service_tickets ALTER COLUMN status DROP DEFAULT;

-- Rename old enum
ALTER TYPE service_ticket_status RENAME TO service_ticket_status_old;

-- Create new enum with correct values
CREATE TYPE service_ticket_status AS ENUM (
  'open',
  'in_progress', 
  'pending_customer',
  'pending_parts',
  'completed',
  'cancelled'
);

-- Update the column to use new enum
ALTER TABLE service_tickets 
  ALTER COLUMN status TYPE service_ticket_status 
  USING (
    CASE status::text
      WHEN 'resolved' THEN 'completed'::service_ticket_status
      ELSE status::text::service_ticket_status
    END
  );

-- Re-add the default
ALTER TABLE service_tickets ALTER COLUMN status SET DEFAULT 'open'::service_ticket_status;

-- Drop old enum
DROP TYPE service_ticket_status_old;

-- Fix service_ticket_attachments column name
ALTER TABLE service_ticket_attachments 
  RENAME COLUMN file_size TO file_size_bytes;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_tickets_status ON service_tickets(status);
CREATE INDEX IF NOT EXISTS idx_service_tickets_priority ON service_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_service_tickets_assigned_to ON service_tickets(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_customer ON service_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_created_at ON service_tickets(created_at);

-- Enable realtime for service_tickets table
ALTER TABLE service_tickets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE service_tickets;

-- Enable realtime for service_ticket_comments
ALTER TABLE service_ticket_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE service_ticket_comments;

-- Enable realtime for service_ticket_events  
ALTER TABLE service_ticket_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE service_ticket_events;