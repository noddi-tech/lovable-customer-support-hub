import React from 'react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { VoiceInterface } from '@/components/dashboard/VoiceInterface';
import { SMSInterface } from '@/components/dashboard/SMSInterface';
import NewsletterBuilder from '@/components/dashboard/NewsletterBuilder';
import ServiceTicketsInterface from '@/components/dashboard/ServiceTicketsInterface';
import DoormanInterface from '@/components/dashboard/DoormanInterface';
import RecruitmentInterface from '@/components/dashboard/RecruitmentInterface';
import SettingsWrapper from '@/components/dashboard/SettingsWrapper';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

interface MainAppProps {
  activeTab: string;
  activeSubTab: string;
  onTabChange: (tab: string, subTab: string) => void;
}

const MainApp: React.FC<MainAppProps> = ({ activeTab, activeSubTab, onTabChange }) => {
  const renderActiveContent = () => {
    // Interactions
    if (activeTab === 'interactions') {
      switch (activeSubTab) {
        case 'text':
          return <Dashboard activeMainTab={activeTab} activeSubTab={activeSubTab} onMainTabChange={onTabChange} />;
        case 'voice':
          return <VoiceInterface />;
        default:
          return <Dashboard activeMainTab={activeTab} activeSubTab={activeSubTab} onMainTabChange={onTabChange} />;
      }
    }

    // Marketing
    if (activeTab === 'marketing') {
      switch (activeSubTab) {
        case 'email':
          return <NewsletterBuilder />;
        case 'sms':
          return <SMSInterface />;
        default:
          return <NewsletterBuilder />;
      }
    }

    // Ops
    if (activeTab === 'ops') {
      switch (activeSubTab) {
        case 'serviceTickets':
          return <ServiceTicketsInterface />;
        case 'doorman':
          return <DoormanInterface />;
        case 'recruitment':
          return <RecruitmentInterface />;
        default:
          return <ServiceTicketsInterface />;
      }
    }

    // Settings - Keep wrapper for complex logic
    if (activeTab === 'settings') {
      return <SettingsWrapper activeSubSection={activeSubTab} />;
    }

    // Default fallback
    return <Dashboard activeMainTab={activeTab} activeSubTab={activeSubTab} onMainTabChange={onTabChange} />;
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar 
          selectedTab="all"
          onTabChange={() => {}}
          activeMainTab={activeTab}
          activeSubTab={activeSubTab}
          onMainTabChange={onTabChange}
        />
        
        <SidebarInset className="flex-1">
          <div className="flex h-14 items-center border-b px-4">
            <SidebarTrigger className="mr-4" />
            <span className="font-medium capitalize">{activeSubTab}</span>
          </div>
          
          <div className="flex-1">
            {renderActiveContent()}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default MainApp;