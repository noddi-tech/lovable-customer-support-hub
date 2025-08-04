-- First, let's ensure we have proper organization mapping
-- Create organizations for demo purposes if they don't exist
INSERT INTO public.organizations (name, slug, primary_color, logo_url) 
VALUES 
  ('Noddi', 'noddi', '#3B82F6', null),
  ('Demo Company', 'demo', '#10B981', null)
ON CONFLICT (slug) DO NOTHING;

-- Function to get organization ID by email domain
CREATE OR REPLACE FUNCTION public.get_organization_by_email_domain(email_domain text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.organizations 
  WHERE slug = CASE 
    WHEN email_domain = 'noddi.no' THEN 'noddi'
    ELSE 'demo'
  END
  LIMIT 1;
$$;

-- Function to handle new user signup with organization assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_email text;
  email_domain text;
  org_id uuid;
BEGIN
  -- Get user email
  user_email := NEW.email;
  
  -- Extract domain from email
  email_domain := split_part(user_email, '@', 2);
  
  -- Get organization ID based on email domain
  org_id := public.get_organization_by_email_domain(email_domain);
  
  -- Insert into profiles with organization
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name, 
    organization_id,
    role,
    is_active
  )
  VALUES (
    NEW.id, 
    user_email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(user_email, '@', 1)),
    org_id,
    'agent',
    true
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup (drop existing if it exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();