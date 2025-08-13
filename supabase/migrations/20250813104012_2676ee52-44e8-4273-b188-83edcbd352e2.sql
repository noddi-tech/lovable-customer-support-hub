-- Add preferred_language column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'no', 'sv', 'da'));

-- Create translations table for dynamic content
CREATE TABLE public.translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_language TEXT NOT NULL DEFAULT 'en',
  target_language TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, source_text, source_language, target_language)
);

-- Enable RLS on translations table
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Create policies for translations table
CREATE POLICY "Users can view translations in their organization" 
ON public.translations 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create translations in their organization" 
ON public.translations 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update translations in their organization" 
ON public.translations 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

-- Create trigger for automatic timestamp updates on translations
CREATE TRIGGER update_translations_updated_at
BEFORE UPDATE ON public.translations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();