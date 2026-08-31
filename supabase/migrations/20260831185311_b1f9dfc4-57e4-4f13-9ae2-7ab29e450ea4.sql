REVOKE EXECUTE ON FUNCTION public.sync_case_on_conversation_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_create_case_for_conversation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_noise_conversation(text, jsonb) FROM PUBLIC, anon, authenticated;