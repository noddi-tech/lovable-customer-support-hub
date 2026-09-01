ALTER TABLE public.customer_notes
  ADD COLUMN IF NOT EXISTS noddi_note_id BIGINT,
  ADD COLUMN IF NOT EXISTS noddi_user_group_id BIGINT,
  ADD COLUMN IF NOT EXISTS synced_to_noddi BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS noddi_sync_error TEXT;

CREATE INDEX IF NOT EXISTS customer_notes_noddi_note_id_idx
  ON public.customer_notes (noddi_note_id) WHERE noddi_note_id IS NOT NULL;