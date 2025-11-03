-- Step 1: Add enum values only
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'super_admin';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'agent' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'agent';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'view_all_organizations' AND enumtypid = 'app_permission'::regtype) THEN
    ALTER TYPE public.app_permission ADD VALUE 'view_all_organizations';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'manage_organizations' AND enumtypid = 'app_permission'::regtype) THEN
    ALTER TYPE public.app_permission ADD VALUE 'manage_organizations';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'view_system_logs' AND enumtypid = 'app_permission'::regtype) THEN
    ALTER TYPE public.app_permission ADD VALUE 'view_system_logs';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'manage_system_settings' AND enumtypid = 'app_permission'::regtype) THEN
    ALTER TYPE public.app_permission ADD VALUE 'manage_system_settings';
  END IF;
END $$;