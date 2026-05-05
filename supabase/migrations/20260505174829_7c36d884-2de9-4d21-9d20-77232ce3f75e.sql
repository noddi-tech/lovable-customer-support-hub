CREATE OR REPLACE FUNCTION public.recruitment_applicant_tag_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tag_name text;
  v_tag_color text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name, color INTO v_tag_name, v_tag_color
      FROM public.recruitment_tags WHERE id = NEW.tag_id;
    INSERT INTO public.recruitment_audit_events (
      organization_id, event_type, event_category,
      subject_table, subject_id, applicant_id,
      actor_profile_id, new_values
    ) VALUES (
      NEW.organization_id, 'tag_added', 'write',
      'applicants', NEW.applicant_id, NEW.applicant_id,
      NEW.added_by,
      jsonb_build_object('tag_id', NEW.tag_id, 'name', v_tag_name, 'color', v_tag_color)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT name, color INTO v_tag_name, v_tag_color
      FROM public.recruitment_tags WHERE id = OLD.tag_id;
    INSERT INTO public.recruitment_audit_events (
      organization_id, event_type, event_category,
      subject_table, subject_id, applicant_id,
      actor_profile_id, old_values
    ) VALUES (
      OLD.organization_id, 'tag_removed', 'write',
      'applicants', OLD.applicant_id, OLD.applicant_id,
      NULL,
      jsonb_build_object('tag_id', OLD.tag_id, 'name', v_tag_name, 'color', v_tag_color)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;