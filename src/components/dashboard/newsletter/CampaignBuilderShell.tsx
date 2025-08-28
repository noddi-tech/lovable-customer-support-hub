import React from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Settings, Layers } from 'lucide-react';
import { useIsMobile, useIsTablet } from '@/hooks/use-responsive';

interface CampaignBuilderShellProps {
  toolbar?: React.ReactNode;
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}

export const CampaignBuilderShell: React.FC<CampaignBuilderShellProps> = ({
  toolbar,
  left,
  center,
  right
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  if (isMobile) {
    // Mobile: Single pane with drawers
    return (
      <div className="flex h-full min-h-0 flex-col">
        {/* Sticky toolbar */}
        {toolbar && (
          <div className="sticky top-0 z-10 border-b border-border bg-background">
            {toolbar}
          </div>
        )}

        {/* Mobile actions bar */}
        <div className="flex flex-wrap items-center gap-2 p-2 border-b border-border bg-card min-w-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <Layers className="h-4 w-4 mr-2" />
                Blocks
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              {left}
            </SheetContent>
          </Sheet>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <Settings className="h-4 w-4 mr-2" />
                Inspector
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              {right}
            </SheetContent>
          </Sheet>
        </div>

        {/* Center content only */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full w-full overflow-auto">
            {center}
          </div>
        </div>
      </div>
    );
  }

  if (isTablet) {
    // Tablet: Two panes with left as drawer
    return (
      <div className="flex h-full min-h-0 flex-col">
        {/* Sticky toolbar */}
        {toolbar && (
          <div className="sticky top-0 z-10 border-b border-border bg-background">
            {toolbar}
          </div>
        )}

        {/* Tablet actions bar */}
        <div className="flex flex-wrap items-center gap-2 p-2 border-b border-border bg-card min-w-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <Menu className="h-4 w-4 mr-2" />
                <span className="truncate">Blocks & Templates</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              {left}
            </SheetContent>
          </Sheet>
        </div>

        {/* Two-pane content */}
        <div
          data-testid="campaigns-grid"
          className="grid min-h-0 flex-1 w-full grid-cols-[minmax(280px,1fr)_minmax(280px,360px)] gap-4 md:gap-6"
        >
          {/* CENTER: Preview/Canvas */}
          <div className="min-h-0 overflow-hidden">
            <div className="h-full w-full overflow-auto">
              {center}
            </div>
          </div>

          {/* RIGHT: Inspector/Properties */}
          <aside className="min-h-0 overflow-hidden border-l border-border bg-card">
            {right}
          </aside>
        </div>
      </div>
    );
  }

  // Desktop: Full three panes
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Sticky toolbar */}
      {toolbar && (
        <div className="sticky top-0 z-10 border-b border-border bg-background">
          {toolbar}
        </div>
      )}

      {/* Three-pane content */}
      <div
        data-testid="campaigns-grid"
        className="grid min-h-0 flex-1 w-full grid-cols-[minmax(240px,280px)_minmax(0,1fr)_minmax(300px,360px)] xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)_minmax(320px,400px)] gap-4 md:gap-6"
      >
        {/* LEFT: Blocks & Templates */}
        <div className="min-h-0 overflow-hidden border-r border-border bg-card">
          {left}
        </div>

        {/* CENTER: Preview/Canvas */}
        <div className="min-h-0 overflow-hidden">
          <div className="h-full w-full overflow-auto">
            {center}
          </div>
        </div>

          {/* RIGHT: Inspector/Properties */}
          <aside className="min-h-0 overflow-hidden border-l border-border bg-card">
            {right}
          </aside>
      </div>
    </div>
  );
};