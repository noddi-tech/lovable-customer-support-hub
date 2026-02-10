ALTER TABLE public.widget_ai_conversations 
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;