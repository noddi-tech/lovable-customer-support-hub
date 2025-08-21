import React from 'react';
import { InteractionsSidebar } from './InteractionsSidebar';
import { SidebarProvider } from '@/contexts/SidebarContext';

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
  // For now, we'll focus on Interactions tab
  // Later this can be extended to handle different tab contexts
  if (activeTab === 'interactions') {
    return (
      <SidebarProvider initialTab={selectedTab}>
        <InteractionsSidebar 
          selectedTab={selectedTab}
          onTabChange={onTabChange}
        />
      </SidebarProvider>
    );
  }

  // Placeholder for other tabs (Marketing, Ops, Settings)
  return (
    <SidebarProvider initialTab={selectedTab}>
      <InteractionsSidebar 
        selectedTab={selectedTab}
        onTabChange={onTabChange}
      />
    </SidebarProvider>
  );
};