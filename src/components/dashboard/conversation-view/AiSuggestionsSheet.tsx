import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiSuggestionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: string[];
  onUseAsIs: (suggestion: string) => void;
  onRefine: (refinementInstructions: string, originalText: string) => Promise<void>;
  isRefining?: boolean;
}

export function AiSuggestionsSheet({
  open,
  onOpenChange,
  suggestions,
  onUseAsIs,
  onRefine,
  isRefining = false,
}: AiSuggestionsSheetProps) {
  const [refiningIndex, setRefiningIndex] = useState<number | null>(null);
  const [refinementText, setRefinementText] = useState('');

  const handleUse = (suggestion: string) => {
    onUseAsIs(suggestion);
    onOpenChange(false);
  };

  const handleStartRefine = (index: number) => {
    setRefiningIndex(index);
    setRefinementText('');
  };

  const handleCancelRefine = () => {
    setRefiningIndex(null);
    setRefinementText('');
  };

  const handleSubmitRefine = async (originalText: string) => {
    if (!refinementText.trim()) return;
    await onRefine(refinementText, originalText);
    setRefiningIndex(null);
    setRefinementText('');
  };

  const handleClose = () => {
    setRefiningIndex(null);
    setRefinementText('');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="sm:max-w-3xl w-full p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Suggestions ({suggestions.length})
          </SheetTitle>
          <SheetDescription>
            Review all suggestions and pick the best one, or refine it with additional instructions.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="grid grid-cols-1 gap-3 pb-4">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={cn(
                  "rounded-lg border border-border bg-card p-4 flex flex-col gap-3 transition-colors",
                  "hover:border-primary/40"
                )}
              >
                {/* Suggestion text */}
                <div className="flex-1 min-h-0">
                  <ScrollArea className="max-h-[200px] w-full">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90 pr-2">
                      {suggestion}
                    </p>
                  </ScrollArea>
                </div>

                {/* Meta + actions */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">~{suggestion.length} characters</p>

                  {refiningIndex === index ? (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">How would you like to adjust this?</Label>
                      <Textarea
                        value={refinementText}
                        onChange={(e) => setRefinementText(e.target.value)}
                        placeholder="E.g., 'Make it more apologetic' or 'Add a discount mention'"
                        className="min-h-[60px] text-xs"
                        emojiAutocomplete={false}
                        disabled={isRefining}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={handleCancelRefine}
                          disabled={isRefining}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => handleSubmitRefine(suggestion)}
                          disabled={!refinementText.trim() || isRefining}
                          className="gap-1"
                        >
                          {isRefining ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Refining…
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3" />
                              Refine
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleStartRefine(index)}
                        className="gap-1 flex-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        Refine
                      </Button>
                      <Button
                        size="xs"
                        onClick={() => handleUse(suggestion)}
                        className="gap-1 flex-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Use as-is
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
