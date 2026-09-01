-- 1. voicemails bucket: remove anonymous insert
DROP POLICY IF EXISTS "System can upload voicemails" ON storage.objects;
CREATE POLICY "Org members can upload voicemails"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voicemails'
  AND (storage.foldername(name))[1] IN (
    SELECT (p.organization_id)::text FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);

-- 2. message-attachments: org-scope the insert policy
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
CREATE POLICY "Org members can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT (om.organization_id)::text FROM public.organization_memberships om
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);

-- 3. remove dead/broken customer policy on messages
DROP POLICY IF EXISTS "Customers can view non-internal messages in their conversations" ON public.messages;

-- 4. revoke EXECUTE on server-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.gdpr_erase_applicant(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_queue_row(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_queue_row(uuid, uuid, jsonb, integer, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_abandon_inactive_chat_sessions() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_close_inactive_conversations() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.extract_email_date(jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_inbox_for_email(text, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_sla_breach() FROM anon, authenticated;