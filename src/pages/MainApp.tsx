import React from 'react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { VoiceInterface } from '@/components/dashboard/VoiceInterface';
import { SMSInterface } from '@/components/dashboard/SMSInterface';
import NewsletterBuilder from '@/components/dashboard/NewsletterBuilder';
import ServiceTicketsInterface from '@/components/dashboard/ServiceTicketsInterface';
import DoormanInterface from '@/components/dashboard/DoormanInterface';
import RecruitmentInterface from '@/components/dashboard/RecruitmentInterface';
import SettingsWrapper from '@/components/dashboard/SettingsWrapper';

interface MainAppProps {
  activeTab: string;
  activeSubTab: string;
}

const MainApp: React.FC<MainAppProps> = ({ activeTab, activeSubTab }) => {
  const renderActiveContent = () => {
    // Interactions
    if (activeTab === 'interactions') {
      switch (activeSubTab) {
        case 'text':
          return <Dashboard />;
        case 'voice':
          return <VoiceInterface />;
        default:
          return <Dashboard />;
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
    return <Dashboard />;
  };

  return (
    <div className="h-screen flex w-full pt-14">
      <div className="flex-1 p-4 overflow-auto">
        {renderActiveContent()}
      </div>
    </div>
  );
};

export default MainApp;