-- Create call_notes table
CREATE TABLE public.call_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  created_by_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.call_notes 
ADD CONSTRAINT call_notes_call_id_fkey 
FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.call_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_notes
CREATE POLICY "Users can view call notes in their organization"
ON public.call_notes
FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create call notes in their organization"
ON public.call_notes
FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id() 
  AND created_by_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.calls 
    WHERE id = call_notes.call_id 
    AND organization_id = get_user_organization_id()
  )
);

CREATE POLICY "Users can update their own call notes"
ON public.call_notes
FOR UPDATE
USING (
  organization_id = get_user_organization_id() 
  AND created_by_id = auth.uid()
)
WITH CHECK (
  organization_id = get_user_organization_id() 
  AND created_by_id = auth.uid()
);

CREATE POLICY "Users can delete their own call notes"
ON public.call_notes
FOR DELETE
USING (
  organization_id = get_user_organization_id() 
  AND created_by_id = auth.uid()
);

-- Create trigger for updated_at
CREATE TRIGGER update_call_notes_updated_at
BEFORE UPDATE ON public.call_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_call_notes_call_id ON public.call_notes(call_id);
CREATE INDEX idx_call_notes_organization_id ON public.call_notes(organization_id);
CREATE INDEX idx_call_notes_created_by_id ON public.call_notes(created_by_id);