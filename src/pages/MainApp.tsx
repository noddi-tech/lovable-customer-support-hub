import React, { useState } from 'react';
import { AppHeader } from '@/components/dashboard/AppHeader';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { AppShell } from '@/components/ui/app-shell';
import { EnhancedInteractionsLayout } from '@/components/dashboard/EnhancedInteractionsLayout';
import NewsletterBuilder from '@/components/dashboard/NewsletterBuilder';
import ServiceTicketsInterface from '@/components/dashboard/ServiceTicketsInterface';
import DoormanInterface from '@/components/dashboard/DoormanInterface';
import RecruitmentInterface from '@/components/dashboard/RecruitmentInterface';
import SettingsWrapper from '@/components/dashboard/SettingsWrapper';
import { MobileSidebarDrawer } from '@/components/dashboard/MobileSidebarDrawer';
import { TabletSidebarCollapsed } from '@/components/dashboard/TabletSidebarCollapsed';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-responsive';

interface MainAppProps {
  activeTab: string;
  activeSubTab: string;
  onTabChange: (tab: string, subTab: string) => void;
}

export const MainApp: React.FC<MainAppProps> = ({ 
  activeTab, 
  activeSubTab, 
  onTabChange 
}) => {
  const [selectedTab, setSelectedTab] = useState('all');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    setMobileNavOpen(false);
  };

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'interactions':
        return (
          <EnhancedInteractionsLayout
            activeSubTab={activeSubTab}
            selectedTab={selectedTab}
            onTabChange={handleTabChange}
            selectedInboxId=""
          />
        );
      case 'marketing':
        if (activeSubTab === 'newsletters') {
          return <NewsletterBuilder />;
        }
        return <div className="p-8 text-center text-muted-foreground">Marketing Dashboard</div>;
      case 'ops':
        switch (activeSubTab) {
          case 'tickets':
            return <ServiceTicketsInterface />;
          case 'doorman':
            return <DoormanInterface />;
          case 'recruitment':
            return <RecruitmentInterface />;
          default:
            return <ServiceTicketsInterface />;
        }
      case 'settings':
        return <SettingsWrapper activeSubSection={activeSubTab} />;
      default:
        return (
          <EnhancedInteractionsLayout
            activeSubTab={activeSubTab}
            selectedTab={selectedTab}
            onTabChange={handleTabChange}
            selectedInboxId=""
          />
        );
    }
  };

  const renderSidebar = () => {
    // Mobile: No persistent sidebar (use drawer)
    if (isMobile) {
      return null;
    }
    
    // Tablet: Collapsed icon sidebar for interactions, hidden for others
    if (isTablet) {
      if (activeTab === 'interactions') {
        return (
          <TabletSidebarCollapsed
            selectedTab={selectedTab}
            onTabChange={handleTabChange}
          />
        );
      }
      return null;
    }

    // Desktop: Full sidebar for interactions, hidden for others
    if (activeTab === 'interactions') {
      return (
        <AppSidebar
          selectedTab={selectedTab}
          onTabChange={handleTabChange}
          activeTab={activeTab}
        />
      );
    }
    return null;
  };

  return (
    <AppShell
      header={
        <AppHeader
          activeTab={activeTab}
          activeSubTab={activeSubTab}
          onTabChange={onTabChange}
          onMenuClick={() => setMobileNavOpen(true)}
          showMenuButton={isMobile && activeTab === 'interactions'}
          sidebarTrigger={isMobile && activeTab === 'interactions' ? (
            <MobileSidebarDrawer
              selectedTab={selectedTab}
              onTabChange={handleTabChange}
              activeTab={activeTab}
            />
          ) : null}
        />
      }
      sidebar={renderSidebar()}
    >
      {renderActiveContent()}
    </AppShell>
  );
};

export default MainApp;