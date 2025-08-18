import React from 'react';
import { useResponsive } from '@/contexts/ResponsiveContext';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';

interface ResponsiveLayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  inspector?: React.ReactNode;
  showInspector?: boolean;
  onToggleInspector?: () => void;
}

export const ResponsiveLayout = ({ 
  sidebar, 
  main, 
  inspector, 
  showInspector = false,
  onToggleInspector 
}: ResponsiveLayoutProps) => {
  const { isMobile, isTablet, isDesktop, isLargeDesktop } = useResponsive();

  // Mobile: Stack layout with tabs
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {main}
      </div>
    );
  }

  // Tablet: 2-pane with collapsible sidebar
  if (isTablet) {
    return (
      <div className="flex h-full">
        {sidebar}
        <div className="flex-1 flex flex-col min-w-0">
          {main}
        </div>
      </div>
    );
  }

  // Desktop: 2-pane (sidebar + main) or 3-pane (sidebar + main + inspector)
  if (isDesktop) {
    return (
      <div className="flex h-full">
        {sidebar}
        <div className="flex-1 flex min-w-0">
          <div className="flex-1 min-w-0">
            {main}
          </div>
          {showInspector && inspector && (
            <div className="w-80 border-l border-border overflow-y-auto">
              {inspector}
            </div>
          )}
        </div>
        {!showInspector && onToggleInspector && (
          <div className="absolute top-20 right-4 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleInspector}
              className="shadow-lg"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Large Desktop: Full 3-pane layout
  return (
    <div className="flex h-full">
      {sidebar}
      <div className="flex-1 flex min-w-0">
        <div className="flex-1 min-w-0">
          {main}
        </div>
        {showInspector && inspector && (
          <div className="w-96 border-l border-border overflow-y-auto">
            {inspector}
          </div>
        )}
      </div>
      {!showInspector && onToggleInspector && (
        <div className="absolute top-20 right-4 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleInspector}
            className="shadow-lg"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};