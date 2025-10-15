import React from 'react';
import { useLocation } from 'react-router-dom';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { InteractionsSidebar } from '@/components/layout/InteractionsSidebar';
import { MarketingSidebar } from '@/components/layout/MarketingSidebar';
import { OperationsSidebar } from '@/components/layout/OperationsSidebar';
import { EnhancedInteractionsLayout } from '@/components/dashboard/EnhancedInteractionsLayout';
import { VoiceInterface } from '@/components/dashboard/VoiceInterface';
import NewsletterBuilder from '@/components/dashboard/NewsletterBuilder';
import ServiceTicketsInterface from '@/components/dashboard/ServiceTicketsInterface';
import DoormanInterface from '@/components/dashboard/DoormanInterface';
import RecruitmentInterface from '@/components/dashboard/RecruitmentInterface';
import VoiceAnalyticsPage from '@/pages/VoiceAnalyticsPage';
import VoiceSettingsPage from '@/pages/VoiceSettingsPage';


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
    if (path.includes('/voice/analytics')) return 'voice-analytics';
    if (path.includes('/voice/settings')) return 'voice-settings';
    if (path.includes('/voice')) return 'voice';
    if (path.includes('/newsletters')) return 'newsletters';
    if (path.includes('/tickets') || path === '/operations') return 'tickets';
    if (path.includes('/doorman')) return 'doorman';
    if (path.includes('/recruitment')) return 'recruitment';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/operations/settings')) return 'operations-settings';
    if (path.includes('/campaigns') || path === '/marketing') return 'campaigns';
    return 'text';
  };

  const renderContent = () => {
    const section = getCurrentSection();
    const subSection = getCurrentSubSection();

    switch (section) {
      case 'interactions':
        // Handle voice analytics and settings
        if (subSection === 'voice-analytics') {
          return <VoiceAnalyticsPage />;
        }
        if (subSection === 'voice-settings') {
          return <VoiceSettingsPage />;
        }
        // Always use EnhancedInteractionsLayout for interactions to preserve sidebar
        return (
          <EnhancedInteractionsLayout
            activeSubTab={subSection}
            selectedTab="all"
            onTabChange={() => {}}
            selectedInboxId=""
          />
        );
      
      case 'marketing':
        if (subSection === 'newsletters') {
          const NewsletterManagementPage = React.lazy(() => import('@/pages/NewsletterManagementPage'));
          return (
            <React.Suspense fallback={<div>Loading...</div>}>
              <NewsletterManagementPage />
            </React.Suspense>
          );
        }
        // Default to campaigns
        return <NewsletterBuilder />;
      
      case 'operations':
        if (subSection === 'tickets') {
          const ServiceTicketsPage = React.lazy(() => import('@/pages/ServiceTicketsPage'));
          return (
            <React.Suspense fallback={<div>Loading...</div>}>
              <ServiceTicketsPage />
            </React.Suspense>
          );
        }
        if (subSection === 'doorman') {
          return <DoormanInterface />;
        }
        if (subSection === 'recruitment') {
          return <RecruitmentInterface />;
        }
        if (subSection === 'analytics') {
          return (
            <div className="flex items-center justify-center h-full p-8 text-center">
              <div className="max-w-md">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">
                  Operations Analytics
                </h2>
                <p className="text-muted-foreground">
                  Analytics dashboard for operations performance and metrics.
                </p>
              </div>
            </div>
          );
        }
        if (subSection === 'operations-settings') {
          return (
            <div className="flex items-center justify-center h-full p-8 text-center">
              <div className="max-w-md">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">
                  Operations Settings
                </h2>
                <p className="text-muted-foreground">
                  Configure operations workflows and preferences.
                </p>
              </div>
            </div>
          );
        }
        // Default to service tickets
        return <ServiceTicketsInterface />;
      
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
    
    switch (section) {
      case 'interactions':
        return <InteractionsSidebar />;
      case 'marketing':
        return <MarketingSidebar />;
      case 'operations':
        return <OperationsSidebar />;
      default:
        return null;
    }
  };

  return (
    <UnifiedAppLayout>
      {renderContent()}
    </UnifiedAppLayout>
  );
};

export default Index;