-- Add noddi_user_id column to service_tickets (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_tickets' AND column_name = 'noddi_user_id'
  ) THEN
    ALTER TABLE service_tickets ADD COLUMN noddi_user_id INTEGER;
  END IF;
END $$;

-- Create index for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_service_tickets_noddi_user_id 
ON service_tickets(noddi_user_id);

-- Drop and recreate foreign key constraint for assigned_to_id
ALTER TABLE service_tickets DROP CONSTRAINT IF EXISTS service_tickets_assigned_to_id_fkey;
ALTER TABLE service_tickets
ADD CONSTRAINT service_tickets_assigned_to_id_fkey 
FOREIGN KEY (assigned_to_id) 
REFERENCES profiles(user_id) 
ON DELETE SET NULL;

-- Drop and recreate foreign key constraint for created_by_id
ALTER TABLE service_tickets DROP CONSTRAINT IF EXISTS service_tickets_created_by_id_fkey;
ALTER TABLE service_tickets
ADD CONSTRAINT service_tickets_created_by_id_fkey 
FOREIGN KEY (created_by_id) 
REFERENCES profiles(user_id) 
ON DELETE RESTRICT;

-- Add documentation comments
COMMENT ON COLUMN service_tickets.noddi_user_id IS 'Noddi system user ID for customer identification';