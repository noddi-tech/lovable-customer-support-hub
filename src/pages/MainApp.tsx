import React, { useState, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { 
  MessageSquare, 
  Mail, 
  Wrench, 
  Settings as SettingsIcon,
  Phone,
  Building,
  User,
  Bell,
  Palette,
  Shield,
  Ticket,
  Users
} from 'lucide-react';
import InteractionsWrapper from '@/components/dashboard/InteractionsWrapper';
import MarketingWrapper from '@/components/dashboard/MarketingWrapper';
import OpsWrapper from '@/components/dashboard/OpsWrapper';
import SettingsWrapper from '@/components/dashboard/SettingsWrapper';
import { useTranslation } from 'react-i18next';
import { AppNavSidebar } from '@/components/navigation/AppNavSidebar';

type MainSection = 'interactions' | 'marketing' | 'ops' | 'settings';
type SubSection = string;

interface NavigationState {
  mainSection: MainSection;
  subSection: SubSection;
}

const MainApp = () => {
  const { t } = useTranslation();
  const [navigationState, setNavigationState] = useState<NavigationState>({
    mainSection: 'interactions',
    subSection: 'text'
  });

  const handleNavigation = useCallback((mainSection: MainSection, subSection: SubSection) => {
    setNavigationState({ mainSection, subSection });
  }, []);

  const interactionsItems = [
    { key: 'text', label: t('textCommunication'), icon: MessageSquare },
    { key: 'voice', label: t('voiceCommunication'), icon: Phone },
  ];

  const marketingItems = [
    { key: 'email', label: t('email'), icon: Mail },
    { key: 'sms', label: t('sms'), icon: MessageSquare },
  ];

  const opsItems = [
    { key: 'serviceTickets', label: t('serviceTickets'), icon: Ticket },
    { key: 'doorman', label: t('doorman'), icon: Shield },
    { key: 'recruitment', label: t('recruitment'), icon: Users },
  ];

  const settingsItems = [
    { key: 'departments', label: t('settings.tabs.departments'), icon: Building },
    { key: 'general', label: t('settings.tabs.general'), icon: SettingsIcon },
    { key: 'profile', label: t('settings.tabs.profile'), icon: User },
    { key: 'notifications', label: t('settings.tabs.notifications'), icon: Bell },
    { key: 'email-templates', label: t('settings.tabs.emailDesign'), icon: Palette },
    { key: 'users', label: t('settings.tabs.users'), icon: User },
    { key: 'admin', label: t('settings.tabs.admin'), icon: Shield },
  ];

  const getTabValue = () => `${navigationState.mainSection}-${navigationState.subSection}`;
  
  const handleTabChange = (value: string) => {
    const [mainSection, subSection] = value.split('-');
    handleNavigation(mainSection as MainSection, subSection);
  };

  const renderContent = () => {
    switch (navigationState.mainSection) {
      case 'interactions':
        return <InteractionsWrapper activeSubSection={navigationState.subSection} />;
      case 'marketing':
        return <MarketingWrapper activeSubSection={navigationState.subSection} />;
      case 'ops':
        return <OpsWrapper activeSubSection={navigationState.subSection} />;
      case 'settings':
        return <SettingsWrapper activeSubSection={navigationState.subSection} />;
      default:
        return <InteractionsWrapper activeSubSection="text" />;
    }
  };

  const getCurrentBreadcrumb = () => {
    const mainSectionLabels = {
      interactions: t('interactions'),
      marketing: t('marketing'), 
      ops: t('ops'),
      settings: t('settings.title')
    };

    const currentMainLabel = mainSectionLabels[navigationState.mainSection];
    
    let currentSubLabel = '';
    switch (navigationState.mainSection) {
      case 'interactions':
        currentSubLabel = interactionsItems.find(item => item.key === navigationState.subSection)?.label || '';
        break;
      case 'marketing':
        currentSubLabel = marketingItems.find(item => item.key === navigationState.subSection)?.label || '';
        break;
      case 'ops':
        currentSubLabel = opsItems.find(item => item.key === navigationState.subSection)?.label || '';
        break;
      case 'settings':
        currentSubLabel = settingsItems.find(item => item.key === navigationState.subSection)?.label || '';
        break;
    }

    return { main: currentMainLabel, sub: currentSubLabel };
  };

  const breadcrumb = getCurrentBreadcrumb();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Main navigation sidebar */}
        <AppNavSidebar 
          navigationState={navigationState}
          onNavigate={handleNavigation}
        />
        
        <SidebarInset className="flex-1">
          {/* Sidebar trigger and main navigation header */}
          <div className="border-b bg-background">
            <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="font-medium text-foreground">{breadcrumb.main}</span>
                {breadcrumb.sub && (
                  <>
                    <span>›</span>
                    <span>{breadcrumb.sub}</span>
                  </>
                )}
              </div>
            </div>
            
            <Tabs value={getTabValue()} onValueChange={handleTabChange} className="w-full">
              <TabsList className="h-12 w-full justify-start rounded-none border-b bg-transparent p-0">
                {/* Interactions tabs */}
                {interactionsItems.map((item) => (
                  <TabsTrigger
                    key={`interactions-${item.key}`}
                    value={`interactions-${item.key}`}
                    className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </TabsTrigger>
                ))}
                
                {/* Marketing tabs */}
                {marketingItems.map((item) => (
                  <TabsTrigger
                    key={`marketing-${item.key}`}
                    value={`marketing-${item.key}`}
                    className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </TabsTrigger>
                ))}
                
                {/* Ops tabs */}
                {opsItems.map((item) => (
                  <TabsTrigger
                    key={`ops-${item.key}`}
                    value={`ops-${item.key}`}
                    className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </TabsTrigger>
                ))}
                
                {/* Settings tabs */}
                {settingsItems.map((item) => (
                  <TabsTrigger
                    key={`settings-${item.key}`}
                    value={`settings-${item.key}`}
                    className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <div className="flex-1 overflow-hidden">
                {/* Interactions content */}
                {interactionsItems.map((item) => (
                  <TabsContent 
                    key={`interactions-${item.key}`}
                    value={`interactions-${item.key}`}
                    className="h-full m-0 p-0"
                  >
                    <InteractionsWrapper activeSubSection={item.key} />
                  </TabsContent>
                ))}
                
                {/* Marketing content */}
                {marketingItems.map((item) => (
                  <TabsContent 
                    key={`marketing-${item.key}`}
                    value={`marketing-${item.key}`}
                    className="h-full m-0 p-0"
                  >
                    <MarketingWrapper activeSubSection={item.key} />
                  </TabsContent>
                ))}
                
                {/* Ops content */}
                {opsItems.map((item) => (
                  <TabsContent 
                    key={`ops-${item.key}`}
                    value={`ops-${item.key}`}
                    className="h-full m-0 p-0"
                  >
                    <OpsWrapper activeSubSection={item.key} />
                  </TabsContent>
                ))}
                
                {/* Settings content */}
                {settingsItems.map((item) => (
                  <TabsContent 
                    key={`settings-${item.key}`}
                    value={`settings-${item.key}`}
                    className="h-full m-0 p-0"
                  >
                    <SettingsWrapper activeSubSection={item.key} />
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );

};

export default MainApp;