import React, { useState } from 'react';
import { ModernLayout } from '@/components/layout/ModernLayout';
import { EnhancedInteractionsLayout } from '@/components/dashboard/EnhancedInteractionsLayout';
import NewsletterBuilder from '@/components/dashboard/NewsletterBuilder';
import ServiceTicketsInterface from '@/components/dashboard/ServiceTicketsInterface';
import DoormanInterface from '@/components/dashboard/DoormanInterface';
import RecruitmentInterface from '@/components/dashboard/RecruitmentInterface';
import SettingsWrapper from '@/components/dashboard/SettingsWrapper';

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

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
  };

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'interactions':
        if (activeSubTab === 'text') {
          return (
            <EnhancedInteractionsLayout
              activeSubTab={activeSubTab}
              selectedTab={selectedTab}
              onTabChange={handleTabChange}
              selectedInboxId=""
            />
          );
        }
        if (activeSubTab === 'voice') {
          return <div className="p-8 text-center text-muted-foreground">Voice Interface</div>;
        }
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
          <div className="flex items-center justify-center h-full p-8 text-center">
            <div className="max-w-md">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">
                Welcome to Customer Support Hub
              </h2>
              <p className="text-muted-foreground">
                Select a section from the sidebar to get started with managing your customer interactions.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <ModernLayout
      activeTab={activeTab}
      activeSubTab={activeSubTab}
      onTabChange={onTabChange}
    >
      {renderActiveContent()}
    </ModernLayout>
  );
};

export default MainApp;