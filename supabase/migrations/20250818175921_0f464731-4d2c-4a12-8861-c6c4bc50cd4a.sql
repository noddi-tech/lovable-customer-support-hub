-- Newsletter builder database schema
CREATE TABLE public.newsletters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  subject TEXT,
  content JSONB NOT NULL DEFAULT '{"blocks": []}',
  template_data JSONB,
  global_styles JSONB DEFAULT '{"primaryColor": "#007aff", "secondaryColor": "#5856d6", "fontFamily": "system", "fontSize": "16px"}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.newsletter_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  content JSONB NOT NULL DEFAULT '{"blocks": []}',
  global_styles JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.newsletter_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  newsletter_id UUID NOT NULL REFERENCES public.newsletters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  segment_criteria JSONB,
  personalization_rules JSONB,
  utm_parameters JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;

-- Newsletters policies
CREATE POLICY "Users can view their own newsletters" 
ON public.newsletters 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own newsletters" 
ON public.newsletters 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own newsletters" 
ON public.newsletters 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own newsletters" 
ON public.newsletters 
FOR DELETE 
USING (auth.uid() = user_id);

-- Templates policies
CREATE POLICY "Users can view their own templates and public templates" 
ON public.newsletter_templates 
FOR SELECT 
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own templates" 
ON public.newsletter_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" 
ON public.newsletter_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" 
ON public.newsletter_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Campaigns policies
CREATE POLICY "Users can view their own campaigns" 
ON public.newsletter_campaigns 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns" 
ON public.newsletter_campaigns 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" 
ON public.newsletter_campaigns 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" 
ON public.newsletter_campaigns 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_newsletters_updated_at
BEFORE UPDATE ON public.newsletters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_newsletter_templates_updated_at
BEFORE UPDATE ON public.newsletter_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_newsletter_campaigns_updated_at
BEFORE UPDATE ON public.newsletter_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();