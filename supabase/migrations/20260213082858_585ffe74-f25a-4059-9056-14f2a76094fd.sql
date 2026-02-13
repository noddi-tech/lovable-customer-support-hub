
-- Replace overly permissive service role policy with a proper one
DROP POLICY IF EXISTS "Service role full access to ai_action_flows" ON public.ai_action_flows;
