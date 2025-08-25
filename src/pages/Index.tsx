import React from 'react';
import { useLocation } from 'react-router-dom';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { InteractionsSidebar } from '@/components/layout/InteractionsSidebar';
import { EnhancedInteractionsLayout } from '@/components/dashboard/EnhancedInteractionsLayout';
import { VoiceInterface } from '@/components/dashboard/VoiceInterface';
import NewsletterBuilder from '@/components/dashboard/NewsletterBuilder';
import ServiceTicketsInterface from '@/components/dashboard/ServiceTicketsInterface';
import DoormanInterface from '@/components/dashboard/DoormanInterface';
import RecruitmentInterface from '@/components/dashboard/RecruitmentInterface';
import { PerformanceStatus } from '../components/dashboard/PerformanceStatus';

const Index = () => {
  const location = useLocation();

  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.includes('marketing')) return 'marketing';
    if (path.includes('operations')) return 'operations';
    return 'interactions';
  };

  const getCurrentSubSection = () => {
    const path = location.pathname;
    if (path === '/voice') return 'voice';
    return 'text';
  };

  const renderContent = () => {
    const section = getCurrentSection();
    const subSection = getCurrentSubSection();

    switch (section) {
      case 'interactions':
        if (subSection === 'voice') {
          return <VoiceInterface />;
        }
        return (
          <EnhancedInteractionsLayout
            activeSubTab={subSection}
            selectedTab="all"
            onTabChange={() => {}}
            selectedInboxId=""
          />
        );
      
      case 'marketing':
        return <NewsletterBuilder />;
      
      case 'operations':
        return (
          <div className="space-y-6">
            <ServiceTicketsInterface />
            <DoormanInterface />  
            <RecruitmentInterface />
          </div>
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-full p-8 text-center">
            <div className="max-w-md">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">
                Welcome to Customer Support Hub
              </h2>
              <p className="text-muted-foreground">
                Select a section from the navigation to get started with managing your customer interactions.
              </p>
            </div>
          </div>
        );
    }
  };

  const getSidebar = () => {
    const section = getCurrentSection();
    
    if (section === 'interactions') {
      return <InteractionsSidebar />;
    }
    
    return null;
  };

  return (
    <>
      <UnifiedAppLayout sidebar={getSidebar()}>
        {renderContent()}
      </UnifiedAppLayout>
      <PerformanceStatus />
    </>
  );
};

export default Index;