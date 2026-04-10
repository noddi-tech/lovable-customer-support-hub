
CREATE TABLE public.inbox_slack_routing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_id uuid REFERENCES public.inboxes(id) ON DELETE CASCADE NOT NULL,
  slack_integration_id uuid REFERENCES public.slack_integrations(id) ON DELETE CASCADE NOT NULL,
  channel_id text NOT NULL,
  channel_name text,
  use_secondary_workspace boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(inbox_id)
);

ALTER TABLE public.inbox_slack_routing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view inbox routing for their org"
ON public.inbox_slack_routing FOR SELECT
TO authenticated
USING (
  slack_integration_id IN (
    SELECT id FROM public.slack_integrations WHERE organization_id = get_user_organization_id()
  )
);

CREATE POLICY "Admins can insert inbox routing"
ON public.inbox_slack_routing FOR INSERT
TO authenticated
WITH CHECK (
  slack_integration_id IN (
    SELECT id FROM public.slack_integrations WHERE organization_id = get_user_organization_id()
  )
  AND has_permission(auth.uid(), 'manage_settings'::app_permission)
);

CREATE POLICY "Admins can update inbox routing"
ON public.inbox_slack_routing FOR UPDATE
TO authenticated
USING (
  slack_integration_id IN (
    SELECT id FROM public.slack_integrations WHERE organization_id = get_user_organization_id()
  )
  AND has_permission(auth.uid(), 'manage_settings'::app_permission)
);

CREATE POLICY "Admins can delete inbox routing"
ON public.inbox_slack_routing FOR DELETE
TO authenticated
USING (
  slack_integration_id IN (
    SELECT id FROM public.slack_integrations WHERE organization_id = get_user_organization_id()
  )
  AND has_permission(auth.uid(), 'manage_settings'::app_permission)
);

CREATE TRIGGER update_inbox_slack_routing_updated_at
BEFORE UPDATE ON public.inbox_slack_routing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
