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

  // Get localStorage values for debugging
  const savedConversationListDesktop = localStorage.getItem('showConversationListDesktop');
  const savedInboxId = localStorage.getItem('selectedInboxId');

  return (
    <div className="fixed bottom-4 right-4 z-[999] bg-black/90 text-white p-3 rounded-lg text-xs font-mono space-y-1 max-w-xs">
      <div className="flex items-center gap-2">
        <span>Screen:</span>
        {isMobile && <Badge variant="destructive">Mobile</Badge>}
        {isTablet && <Badge variant="secondary">Tablet</Badge>}
        {isDesktop && <Badge variant="default">Desktop</Badge>}
      </div>
      <div>Width: {window.innerWidth}px</div>
      <div>Conversation List: {showConversationList ? 'Visible' : 'Hidden'}</div>
      <div>Sidebar: {showSidebar ? 'Visible' : 'Hidden'}</div>
      <div>CSS Classes: {className}</div>
      <div className="border-t border-white/20 pt-1 mt-1">
        <div>localStorage Debug:</div>
        <div>List Desktop: {savedConversationListDesktop || 'null'}</div>
        <div>Inbox ID: {savedInboxId || 'null'}</div>
      </div>
      <div className="border-t border-white/20 pt-1 mt-1 text-red-300">
        <div>Grid Template:</div>
        <div className="break-all">
          {(document.querySelector('.app-main') as HTMLElement)?.style?.gridTemplateColumns || 'CSS default'}
        </div>
      </div>
    </div>
  );
};