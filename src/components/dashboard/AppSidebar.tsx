import React from 'react';
import { OptimizedInteractionsSidebar } from './OptimizedInteractionsSidebar';
import { SidebarStateManager } from '@/components/ui/sidebar-state-manager';

interface AppSidebarProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  activeTab?: string; // Main app tab (interactions, marketing, etc.)
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  selectedTab,
  onTabChange,
  activeTab = 'interactions'
}) => {
  // For now, we'll focus on Interactions tab with optimized performance
  // Later this can be extended to handle different tab contexts
  if (activeTab === 'interactions') {
    return (
      <SidebarStateManager initialTab={selectedTab}>
        <OptimizedInteractionsSidebar 
          selectedTab={selectedTab}
          onTabChange={onTabChange}
        />
      </SidebarStateManager>
    );
  }

  // Placeholder for other tabs (Marketing, Ops, Settings) - use basic version
  return (
    <SidebarStateManager initialTab={selectedTab}>
      <OptimizedInteractionsSidebar 
        selectedTab={selectedTab}
        onTabChange={onTabChange}
      />
    </SidebarStateManager>
  );
};