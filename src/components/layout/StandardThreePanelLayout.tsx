import React, { ReactNode } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-responsive';
import { useResizablePanels } from '@/hooks/useResizablePanels';
import { cn } from '@/lib/utils';

interface StandardThreePanelLayoutProps {
  storageKey: string;
  header?: ReactNode;
  sidebar: ReactNode;
  listView: ReactNode;
  detailView?: ReactNode;
  className?: string;
  showDetailView?: boolean;
  onBack?: () => void;
}

export const StandardThreePanelLayout: React.FC<StandardThreePanelLayoutProps> = ({
  storageKey,
  header,
  sidebar,
  listView,
  detailView,
  className,
  showDetailView = false,
  onBack
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  const { getPanelSize, updatePanelSize } = useResizablePanels({
    storageKey,
    defaultSizes: {
      sidebar: isMobile ? 100 : isTablet ? 30 : 25,
      list: isMobile ? 100 : isTablet ? 35 : 40,
      detail: isMobile ? 100 : isTablet ? 35 : 35
    },
    minSizes: {
      sidebar: isMobile ? 100 : 20,
      list: isMobile ? 100 : 30,
      detail: isMobile ? 100 : 25
    },
    maxSizes: {
      sidebar: isMobile ? 100 : 50,
      list: isMobile ? 100 : 60,
      detail: isMobile ? 100 : 50
    }
  });

  const enableResizing = isDesktop || isTablet;

  if (isMobile) {
    return (
      <div className={cn("app-root bg-gradient-surface flex flex-col h-screen", className)}>
        {header && (
          <div className="app-header shrink-0">
            {header}
          </div>
        )}
        
        <div className="app-main bg-gradient-surface flex-1 min-h-0">
          {showDetailView ? (
            <div className="h-full animate-slide-in-right">
              {detailView}
            </div>
          ) : (
            <div className="h-full">
              {listView}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("app-root bg-gradient-surface flex flex-col h-screen", className)}>
      {header && (
        <div className="app-header shrink-0">
          {header}
        </div>
      )}
      
      <div className="app-main bg-gradient-surface flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Sidebar Panel */}
          <ResizablePanel 
            defaultSize={getPanelSize('sidebar')}
            minSize={20}
            maxSize={50}
            onResize={(size) => updatePanelSize('sidebar', size)}
            className="border-r border-border bg-card/80 backdrop-blur-sm shadow-surface"
          >
            {sidebar}
          </ResizablePanel>

          {enableResizing && <ResizableHandle withHandle />}

          {/* List Panel */}
          <ResizablePanel 
            defaultSize={getPanelSize('list')}
            minSize={30}
            maxSize={showDetailView ? 60 : 100}
            onResize={(size) => updatePanelSize('list', size)}
            className="flex flex-col bg-gradient-surface border-r border-border"
          >
            {listView}
          </ResizablePanel>

          {/* Detail Panel - Only show if detailView exists and showDetailView is true */}
          {showDetailView && detailView && (
            <>
              {enableResizing && <ResizableHandle withHandle />}
              <ResizablePanel 
                defaultSize={getPanelSize('detail')}
                minSize={25}
                onResize={(size) => updatePanelSize('detail', size)}
                className="flex flex-col bg-gradient-surface animate-fade-in"
              >
                {detailView}
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
};