-- Add timezone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN timezone TEXT DEFAULT 'UTC';

-- Add a comment to explain the column
COMMENT ON COLUMN public.profiles.timezone IS 'User preferred timezone (e.g., America/New_York, Europe/Oslo, UTC)';

-- Create an index for better performance on timezone queries
CREATE INDEX idx_profiles_timezone ON public.profiles(timezone);

-- Add a constraint to ensure valid timezone format (basic validation)
ALTER TABLE public.profiles 
ADD CONSTRAINT check_timezone_format 
CHECK (timezone ~ '^[A-Za-z_]+/[A-Za-z_]+$' OR timezone = 'UTC');