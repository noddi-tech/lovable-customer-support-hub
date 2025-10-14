-- ============================================
-- CRITICAL SECURITY FIXES
-- ============================================

-- 1. FIX CUSTOMER PII EXPOSURE
-- Restrict customer data access to only users who interact with them
DROP POLICY IF EXISTS "Users can view customers in their organization" ON customers;

CREATE POLICY "Users can view customers they interact with"
ON customers FOR SELECT
USING (
  organization_id = get_user_organization_id() AND
  (
    has_permission(auth.uid(), 'view_all_conversations') OR
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.customer_id = customers.id
      AND (c.assigned_to_id = auth.uid() OR c.department_id = get_user_department_id())
    )
  )
);

-- 2. FIX VOICEMAIL STORAGE BUCKET - Make it private
UPDATE storage.buckets 
SET public = false 
WHERE name = 'voicemails';

-- Add RLS policy for voicemail storage access
CREATE POLICY "Users can access voicemails in their organization"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voicemails' AND
  EXISTS (
    SELECT 1 
    FROM internal_events ie
    JOIN calls c ON ie.call_id = c.id
    WHERE ie.event_data->>'storage_path' = storage.objects.name
    AND c.organization_id = get_user_organization_id()
  )
);

-- 3. ENSURE ALL SECURITY DEFINER FUNCTIONS HAVE FIXED SEARCH PATH
-- Update any functions missing search_path (based on linter warnings)

-- Fix handle_new_user if needed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  email_domain text;
  org_id uuid;
BEGIN
  user_email := NEW.email;
  email_domain := split_part(user_email, '@', 2);
  org_id := public.get_organization_by_email_domain(email_domain);
  
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

-- Fix send_assignment_notification if needed
CREATE OR REPLACE FUNCTION public.send_assignment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_user_name TEXT;
  conversation_subject TEXT;
  note_content_preview TEXT;
BEGIN
  IF NEW.is_internal = true AND NEW.assigned_to_id IS NOT NULL THEN
    IF (OLD IS NULL) OR (OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id) THEN
      SELECT full_name INTO assigned_user_name
      FROM public.profiles 
      WHERE user_id = NEW.assigned_to_id;
      
      SELECT subject INTO conversation_subject
      FROM public.conversations
      WHERE id = NEW.conversation_id;
      
      note_content_preview := LEFT(NEW.content, 100);
      IF LENGTH(NEW.content) > 100 THEN
        note_content_preview := note_content_preview || '...';
      END IF;
      
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        data
      ) VALUES (
        NEW.assigned_to_id,
        'Internal Note Assigned',
        'You have been assigned an internal note in: ' || COALESCE(conversation_subject, 'Untitled Conversation'),
        'info',
        jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'message_id', NEW.id,
          'note_preview', note_content_preview
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;