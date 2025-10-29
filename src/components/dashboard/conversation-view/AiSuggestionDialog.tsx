import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, CheckCircle2, Star } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AiSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: string;
  qualityScore?: number;
  fromKnowledgeBase?: boolean;
  onUseAsIs: () => void;
  onRefine: (refinementInstructions: string, originalText: string) => Promise<void>;
  isRefining?: boolean;
}

export function AiSuggestionDialog({
  open,
  onOpenChange,
  suggestion,
  qualityScore,
  fromKnowledgeBase,
  onUseAsIs,
  onRefine,
  isRefining = false,
}: AiSuggestionDialogProps) {
  const [refinementInstructions, setRefinementInstructions] = useState('');
  const [showRefinementInput, setShowRefinementInput] = useState(false);

  const handleRefine = async () => {
    if (!refinementInstructions.trim()) return;
    await onRefine(refinementInstructions, suggestion);
    setRefinementInstructions('');
    setShowRefinementInput(false);
  };

  const handleUseAsIs = () => {
    onUseAsIs();
    onOpenChange(false);
  };

  const handleClose = () => {
    setRefinementInstructions('');
    setShowRefinementInput(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Suggestion Preview
            </DialogTitle>
            <div className="flex items-center gap-2">
              {fromKnowledgeBase && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Knowledge Base
                </Badge>
              )}
              {qualityScore !== undefined && qualityScore > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  {qualityScore.toFixed(1)}
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription>
            Review the full suggestion before using it, or adjust it with additional instructions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Full suggestion text */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Suggested Response</Label>
            <ScrollArea className="h-[200px] w-full rounded-md border border-border bg-muted/30 p-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{suggestion}</p>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              ~{suggestion.length} characters
            </p>
          </div>

          {/* Refinement section */}
          {showRefinementInput ? (
            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="refinement" className="text-sm font-medium">
                  How would you like to adjust this?
                </Label>
                <Textarea
                  id="refinement"
                  value={refinementInstructions}
                  onChange={(e) => setRefinementInstructions(e.target.value)}
                  placeholder="E.g., 'Mention we'll provide the discount' or 'Make it more apologetic'"
                  className="min-h-[80px] text-sm"
                  disabled={isRefining}
                />
                <p className="text-xs text-muted-foreground">
                  The AI will regenerate the suggestion based on your instructions.
                </p>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRefinementInput(true)}
                className="w-full gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Want to adjust this suggestion?
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isRefining}
          >
            Cancel
          </Button>
          
          {showRefinementInput && (
            <Button
              variant="secondary"
              onClick={handleRefine}
              disabled={!refinementInstructions.trim() || isRefining}
              className="gap-2"
            >
              {isRefining ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refining...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Refine with AI
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={handleUseAsIs}
            disabled={isRefining}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Use as-is
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
