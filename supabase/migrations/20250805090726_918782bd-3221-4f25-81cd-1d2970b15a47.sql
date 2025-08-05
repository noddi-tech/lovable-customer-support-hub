-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create permissions enum
CREATE TYPE public.app_permission AS ENUM (
  'manage_users',
  'manage_departments', 
  'manage_inboxes',
  'manage_settings',
  'view_all_conversations',
  'send_emails',
  'receive_emails'
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_id UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Create role_permissions table to define what each role can do
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission app_permission NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user has a permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission app_permission)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.permission = _permission
  )
$$;

-- Create function to get user's organization (needed for RLS)
CREATE OR REPLACE FUNCTION public.get_user_organization_from_profile(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id;
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users in same organization can view user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.get_user_organization_from_profile(user_id) = public.get_user_organization_id()
);

CREATE POLICY "Admins can manage user roles in their organization"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_permission(auth.uid(), 'manage_users') AND
  public.get_user_organization_from_profile(user_id) = public.get_user_organization_id()
)
WITH CHECK (
  public.has_permission(auth.uid(), 'manage_users') AND
  public.get_user_organization_from_profile(user_id) = public.get_user_organization_id()
);

-- RLS Policies for role_permissions (read-only for most users)
CREATE POLICY "Everyone can view role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

-- Insert default role permissions
INSERT INTO public.role_permissions (role, permission) VALUES
-- Admin permissions
('admin', 'manage_users'),
('admin', 'manage_departments'),
('admin', 'manage_inboxes'),
('admin', 'manage_settings'),
('admin', 'view_all_conversations'),
('admin', 'send_emails'),
('admin', 'receive_emails'),
-- User permissions
('user', 'send_emails'),
('user', 'receive_emails');

-- Update profiles table to include role field for quick access
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_role app_role DEFAULT 'user';

-- Create trigger to automatically assign user role when profile is created
CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role, created_by_id)
  VALUES (NEW.user_id, COALESCE(NEW.primary_role, 'user'), NEW.user_id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_user_role();