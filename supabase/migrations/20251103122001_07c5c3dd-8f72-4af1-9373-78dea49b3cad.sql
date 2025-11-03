-- Migration to fix service ticket foreign keys
-- Step 1: Make user ID columns nullable where they have NOT NULL constraints

ALTER TABLE public.service_tickets
  ALTER COLUMN created_by_id DROP NOT NULL;

ALTER TABLE public.service_ticket_comments
  ALTER COLUMN created_by_id DROP NOT NULL;

-- Step 2: Set orphaned user IDs to NULL in all tables
UPDATE public.service_tickets
SET created_by_id = NULL
WHERE created_by_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = service_tickets.created_by_id
  );

UPDATE public.service_tickets
SET assigned_to_id = NULL
WHERE assigned_to_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = service_tickets.assigned_to_id
  );

UPDATE public.service_ticket_events
SET triggered_by_id = NULL
WHERE triggered_by_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = service_ticket_events.triggered_by_id
  );

UPDATE public.service_ticket_comments
SET created_by_id = NULL
WHERE created_by_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = service_ticket_comments.created_by_id
  );

UPDATE public.service_ticket_attachments
SET uploaded_by_id = NULL
WHERE uploaded_by_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = service_ticket_attachments.uploaded_by_id
  );

-- Step 3: Add the foreign key constraints pointing to profiles(id)
ALTER TABLE public.service_tickets
  DROP CONSTRAINT IF EXISTS service_tickets_assigned_to_id_fkey,
  DROP CONSTRAINT IF EXISTS service_tickets_created_by_id_fkey,
  ADD CONSTRAINT service_tickets_assigned_to_id_fkey 
    FOREIGN KEY (assigned_to_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT service_tickets_created_by_id_fkey 
    FOREIGN KEY (created_by_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.service_ticket_events
  DROP CONSTRAINT IF EXISTS service_ticket_events_triggered_by_id_fkey,
  ADD CONSTRAINT service_ticket_events_triggered_by_id_fkey 
    FOREIGN KEY (triggered_by_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.service_ticket_comments
  DROP CONSTRAINT IF EXISTS service_ticket_comments_created_by_id_fkey,
  ADD CONSTRAINT service_ticket_comments_created_by_id_fkey 
    FOREIGN KEY (created_by_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.service_ticket_attachments
  DROP CONSTRAINT IF EXISTS service_ticket_attachments_uploaded_by_id_fkey,
  ADD CONSTRAINT service_ticket_attachments_uploaded_by_id_fkey 
    FOREIGN KEY (uploaded_by_id) REFERENCES public.profiles(id) ON DELETE SET NULL;