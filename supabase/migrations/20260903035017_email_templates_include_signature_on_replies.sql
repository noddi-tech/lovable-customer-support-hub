-- Optional signature on conversation replies (default off).
-- New outbound emails still use the branded header/footer template;
-- replies send plain text without header/footer chrome.
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS include_signature_on_replies boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.email_templates.include_signature_on_replies IS
  'When true, append signature_content to plain-text conversation replies. Header/footer are never applied to replies.';
