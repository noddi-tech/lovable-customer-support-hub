import React, { ReactNode, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-responsive';

interface MasterDetailShellProps {
  children?: ReactNode;
  className?: string;
  
  // Layout panes
  left?: ReactNode;
  center?: ReactNode;
  detailLeft?: ReactNode;
  detailRight?: ReactNode;
  
  // State management
  isDetail: boolean;
  onBack: () => void;
  
  // Accessibility
  backButtonLabel?: string;
  leftPaneLabel?: string;
  centerPaneLabel?: string;
  detailLeftLabel?: string;
  detailRightLabel?: string;
}

export const MasterDetailShell: React.FC<MasterDetailShellProps> = ({
  children,
  className,
  left,
  center,
  detailLeft,
  detailRight,
  isDetail,
  onBack,
  backButtonLabel = "Back to Inbox",
  leftPaneLabel = "Inbox list",
  centerPaneLabel = "Conversation list", 
  detailLeftLabel = "Message thread",
  detailRightLabel = "Reply and actions"
}) => {
  const isMobile = useIsMobile();

  const handleBackClick = useCallback(() => {
    onBack();
  }, [onBack]);

  // Mobile layout: Single pane with Sheet for actions
  if (isMobile) {
    return (
      <div className={cn(
        "h-full flex flex-col min-h-0 bg-background",
        className
      )}>
        {/* Mobile back button when in detail mode */}
        {isDetail && (
          <div className="flex items-center gap-2 p-3 border-b border-border bg-background flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              className="flex items-center gap-2"
              aria-label={backButtonLabel}
            >
              <ArrowLeft className="h-4 w-4" />
              {backButtonLabel}
            </Button>
          </div>
        )}
        
        {/* Mobile content area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {isDetail ? (
            <div className="h-full flex flex-col min-h-0">
              {/* Detail content takes most space */}
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full" aria-label={detailLeftLabel}>
                  <div className="p-4">
                    {detailLeft}
                  </div>
                </ScrollArea>
              </div>
              
              {/* Actions as Sheet */}
              {detailRight && (
                <div className="border-t border-border bg-card p-4 flex-shrink-0">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="w-full">
                        Actions & Reply
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[70vh]">
                      <SheetHeader>
                        <SheetTitle>Reply & Actions</SheetTitle>
                        <SheetDescription>
                          Manage conversation and send replies
                        </SheetDescription>
                      </SheetHeader>
                      <ScrollArea className="h-full mt-4" aria-label={detailRightLabel}>
                        {detailRight}
                      </ScrollArea>
                    </SheetContent>
                  </Sheet>
                </div>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full" aria-label={centerPaneLabel}>
              <div className="p-4">
                {center}
              </div>
            </ScrollArea>
          )}
        </div>
        
        {children}
      </div>
    );
  }

  // Desktop/Tablet layout
  return (
    <div className={cn(
      "h-full min-h-0 w-full",
      className
    )}>
      {isDetail ? (
        // Detail mode: Message thread + Reply sidebar
        <div 
          data-testid="detail-grid" 
          className="grid h-full min-h-0 w-full max-w-none grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] gap-6 md:gap-8"
        >
          {/* Detail left: Message thread */}
          <div className="min-h-0 min-w-0 border-r border-border">
            <ScrollArea className="h-full overflow-y-auto" aria-label={detailLeftLabel}>
              <div className="p-3 sm:p-4">
                {detailLeft}
              </div>
            </ScrollArea>
          </div>
          
          {/* Detail right: Reply & Actions sidebar */}
          <div className="min-h-0 min-w-0 bg-card">
            <ScrollArea className="h-full overflow-y-auto" aria-label={detailRightLabel}>
              <div className="p-3 sm:p-4">
                {detailRight}
              </div>
            </ScrollArea>
          </div>
        </div>
      ) : (
        // List mode: Inbox list + Conversation list  
        <div 
          data-testid="list-grid"
          className="grid h-full min-h-0 w-full max-w-none grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] gap-6 md:gap-8"
        >
          {/* Left: Inbox list */}
          {left && (
            <div className="min-h-0 min-w-0 border-r border-border bg-muted/30">
              <ScrollArea className="h-full overflow-y-auto" aria-label={leftPaneLabel}>
                <div className="p-4">
                  {left}
                </div>
              </ScrollArea>
            </div>
          )}
          
          {/* Center: Conversation list */}
          <div className="min-h-0 min-w-0">
            <ScrollArea className="h-full overflow-y-auto" aria-label={centerPaneLabel}>
              <div className="p-3 sm:p-4">
                {center}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
};