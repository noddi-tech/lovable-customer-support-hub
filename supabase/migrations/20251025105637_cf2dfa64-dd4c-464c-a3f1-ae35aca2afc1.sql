-- Add feedback tracking to response_tracking table
ALTER TABLE public.response_tracking
ADD COLUMN IF NOT EXISTS feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS feedback_comment TEXT,
ADD COLUMN IF NOT EXISTS feedback_submitted_at TIMESTAMP WITH TIME ZONE;

-- Create index for feedback queries
CREATE INDEX IF NOT EXISTS idx_response_tracking_feedback 
ON public.response_tracking(feedback_rating, feedback_submitted_at)
WHERE feedback_rating IS NOT NULL;

-- Create function to update knowledge entry quality based on feedback
CREATE OR REPLACE FUNCTION public.update_knowledge_quality_from_feedback()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  avg_feedback NUMERIC;
  feedback_count INTEGER;
  knowledge_id UUID;
BEGIN
  IF NEW.feedback_rating IS NOT NULL AND (OLD.feedback_rating IS NULL OR OLD.feedback_rating != NEW.feedback_rating) THEN
    knowledge_id := NEW.knowledge_entry_id;
    
    IF knowledge_id IS NOT NULL THEN
      SELECT 
        AVG(feedback_rating)::NUMERIC,
        COUNT(*)
      INTO avg_feedback, feedback_count
      FROM public.response_tracking
      WHERE knowledge_entry_id = knowledge_id
        AND feedback_rating IS NOT NULL;
      
      UPDATE public.knowledge_entries
      SET 
        quality_score = (quality_score * 0.7) + (avg_feedback * 0.3),
        updated_at = now()
      WHERE id = knowledge_id;
      
      RAISE LOG 'Updated knowledge entry % quality score based on % feedback ratings (avg: %)', 
        knowledge_id, feedback_count, avg_feedback;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for feedback-based quality updates
DROP TRIGGER IF EXISTS trigger_update_quality_from_feedback ON public.response_tracking;
CREATE TRIGGER trigger_update_quality_from_feedback
  AFTER UPDATE ON public.response_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_knowledge_quality_from_feedback();