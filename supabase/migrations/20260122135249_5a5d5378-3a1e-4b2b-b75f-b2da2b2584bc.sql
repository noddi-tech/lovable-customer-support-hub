-- Add language column to widget_configs table
ALTER TABLE public.widget_configs 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'no';

-- Add comment for documentation
COMMENT ON COLUMN public.widget_configs.language IS 'Language code for widget UI (en, no, es, fr, de, it, pt, nl, sv, da)';