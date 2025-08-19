-- Create trigger to automatically set organization_id for voice integrations
CREATE OR REPLACE FUNCTION public.set_voice_integration_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Set organization_id from the current user's organization
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_user_organization_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the trigger
CREATE TRIGGER trigger_set_voice_integration_organization_id
  BEFORE INSERT ON public.voice_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_voice_integration_organization_id();