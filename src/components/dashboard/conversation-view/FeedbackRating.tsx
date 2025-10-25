import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeedbackRatingProps {
  messageId: string;
  onSubmit?: () => void;
}

export function FeedbackRating({ messageId, onSubmit }: FeedbackRatingProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!rating) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('submit-feedback', {
        body: { messageId, rating, comment: comment || null }
      });

      if (error) throw error;

      toast({
        title: "Feedback submitted",
        description: "Thank you for helping improve our AI suggestions!",
      });

      setIsSubmitted(true);
      onSubmit?.();
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast({
        title: "Failed to submit feedback",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Star className="w-4 h-4 fill-primary text-primary" />
        Thank you for your feedback!
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
      <p className="text-sm font-medium">Rate this AI suggestion</p>
      
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(null)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-6 h-6 ${
                (hoveredRating !== null ? star <= hoveredRating : star <= (rating || 0))
                  ? 'fill-primary text-primary'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>

      {rating && (
        <>
          <Textarea
            placeholder="Optional: Tell us why you gave this rating..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[60px]"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </>
      )}
    </div>
  );
}
