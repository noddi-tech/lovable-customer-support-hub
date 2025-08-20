import React, { useState } from 'react';
import { AppHeader } from '@/components/dashboard/AppHeader';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { InteractionsLayout } from '@/components/dashboard/InteractionsLayout';
import { NewsletterBuilder } from '@/components/dashboard/NewsletterBuilder';
import { SMSInterface } from '@/components/dashboard/SMSInterface';
import { ServiceTicketsInterface } from '@/components/dashboard/ServiceTicketsInterface';
import { DoormanInterface } from '@/components/dashboard/DoormanInterface';
import RecruitmentInterface from '@/components/dashboard/RecruitmentInterface';
import { SettingsWrapper } from '@/components/dashboard/SettingsWrapper';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-responsive';

interface MainAppProps {
  activeTab: string;
  activeSubTab: string;
  onTabChange: (tab: string, subTab: string) => void;
}

const MainApp: React.FC<MainAppProps> = ({ activeTab, activeSubTab, onTabChange }) => {
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedInboxId, setSelectedInboxId] = useState('all');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const isMobile = useIsMobile();

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    if (isMobile) {
      setShowMobileSidebar(false);
    }
  };

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'interactions':
        return (
          <InteractionsLayout
            activeSubTab={activeSubTab}
            selectedTab={selectedTab}
            onTabChange={handleTabChange}
            selectedInboxId={selectedInboxId}
          />
        );
      case 'marketing':
        switch (activeSubTab) {
          case 'newsletters':
            return <NewsletterBuilder />;
          default:
            return <NewsletterBuilder />;
        }
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
        return <SettingsWrapper />;
      default:
        return (
          <InteractionsLayout
            activeSubTab="text"
            selectedTab={selectedTab}
            onTabChange={handleTabChange}
            selectedInboxId={selectedInboxId}
          />
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="app-root">
        {/* App Header - Always visible */}
        <AppHeader
          activeTab={activeTab}
          activeSubTab={activeSubTab}
          onTabChange={onTabChange}
          onMenuClick={() => setShowMobileSidebar(true)}
          showMenuButton={isMobile && activeTab === 'interactions'}
        />

        {/* Main Content Area with Sidebar */}
        <div className="app-main flex">
          {/* Sidebar - Only show for interactions */}
          {activeTab === 'interactions' && (
            <AppSidebar 
              selectedTab={selectedTab}
              onTabChange={handleTabChange}
            />
          )}
          
          {/* Main Content */}
          <SidebarInset className={activeTab === 'interactions' ? 'flex-1' : 'w-full'}>
            {renderActiveContent()}
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainApp;