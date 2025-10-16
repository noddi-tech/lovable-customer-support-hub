import React, { useState, useMemo, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-responsive';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface VoiceLayoutProps {
  leftPane: React.ReactNode;
  centerPane: React.ReactNode;
  rightPane: React.ReactNode;
  leftPaneLabel?: string;
  centerPaneLabel?: string;
  rightPaneLabel?: string;
}

export const VoiceLayout: React.FC<VoiceLayoutProps> = ({
  leftPane,
  centerPane,
  rightPane,
  leftPaneLabel = 'Filters',
  centerPaneLabel = 'Items',
  rightPaneLabel = 'Customer Info',
}) => {
  const isMobile = useIsMobile();
  const [workspaceVisible, setWorkspaceVisible] = useState(false);

  // Detect Aircall workspace visibility
  useEffect(() => {
    const checkWorkspaceVisibility = () => {
      const container = document.querySelector('#aircall-workspace-container');
      if (container) {
        const isVisible = container.classList.contains('aircall-visible');
        setWorkspaceVisible(isVisible);
      }
    };

    // Check immediately
    checkWorkspaceVisibility();

    // Set up MutationObserver to watch for class changes
    const container = document.querySelector('#aircall-workspace-container');
    if (container) {
      const observer = new MutationObserver(checkWorkspaceVisibility);
      observer.observe(container, {
        attributes: true,
        attributeFilter: ['class']
      });

      return () => observer.disconnect();
    }

    // Fallback: check periodically if container doesn't exist yet
    const interval = setInterval(checkWorkspaceVisibility, 500);
    return () => clearInterval(interval);
  }, []);

  // Mobile layout with tabs
  // Add bottom padding to account for fixed phone bar
  if (isMobile) {
    return (
      <div className="h-full flex flex-col pb-20">
        <Tabs defaultValue="center" className="flex-1 flex flex-col">
          <TabsList className="w-full grid grid-cols-3 flex-shrink-0">
            <TabsTrigger value="left">{leftPaneLabel}</TabsTrigger>
            <TabsTrigger value="center">{centerPaneLabel}</TabsTrigger>
            <TabsTrigger value="right">{rightPaneLabel}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="left" className="flex-1 m-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                {leftPane}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="center" className="flex-1 m-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                {centerPane}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="right" className="flex-1 m-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                {rightPane}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Desktop layout with 3 columns always visible
  // Add bottom padding to account for fixed phone bar
  // Add right padding when workspace is visible to prevent overlap
  return (
    <div className="h-full grid grid-cols-[280px_minmax(0,1fr)_360px] gap-0 overflow-hidden pb-20">
      {/* Left pane - Filters */}
      <div className="border-r border-border bg-muted/30 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            {leftPane}
          </div>
        </ScrollArea>
      </div>

      {/* Center pane - List */}
      <div className={`border-r border-border bg-background overflow-hidden transition-[padding] duration-300 ease-in-out ${
        workspaceVisible ? 'pr-[400px]' : ''
      }`}>
        <ScrollArea className="h-full">
          <div className="p-4">
            {centerPane}
          </div>
        </ScrollArea>
      </div>

      {/* Right pane - Customer Sidebar (Always visible) */}
      <div className="bg-muted/20 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            {rightPane}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
