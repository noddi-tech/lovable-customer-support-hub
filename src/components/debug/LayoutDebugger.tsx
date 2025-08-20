import React from 'react';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-responsive';
import { Badge } from '@/components/ui/badge';

interface LayoutDebuggerProps {
  showConversationList?: boolean;
  showSidebar?: boolean;
  className?: string;
}

export const LayoutDebugger: React.FC<LayoutDebuggerProps> = ({
  showConversationList,
  showSidebar,
  className
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[999] bg-black/80 text-white p-3 rounded-lg text-xs font-mono space-y-1">
      <div className="flex items-center gap-2">
        <span>Screen:</span>
        {isMobile && <Badge variant="destructive">Mobile</Badge>}
        {isTablet && <Badge variant="secondary">Tablet</Badge>}
        {isDesktop && <Badge variant="default">Desktop</Badge>}
      </div>
      <div>Width: {window.innerWidth}px</div>
      <div>Conversation List: {showConversationList ? 'Visible' : 'Hidden'}</div>
      <div>Sidebar: {showSidebar ? 'Visible' : 'Hidden'}</div>
      <div>Classes: {className}</div>
    </div>
  );
};