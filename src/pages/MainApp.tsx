import React, { useState, useCallback } from 'react';
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
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
import { cn } from '@/lib/utils';

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

  const renderDropdownContent = (items: any[], mainSection: MainSection) => (
    <NavigationMenuContent className="bg-card border border-border shadow-lg rounded-lg p-2 min-w-[200px] z-50">
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key}>
            <NavigationMenuLink
              onClick={() => handleNavigation(mainSection, item.key)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                navigationState.mainSection === mainSection && navigationState.subSection === item.key
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavigationMenuLink>
          </li>
        ))}
      </ul>
    </NavigationMenuContent>
  );

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
    <div className="h-screen flex flex-col">
      {/* Navigation Header */}
      <div className="border-b bg-background px-6 py-3 space-y-3">
        <NavigationMenu className="max-w-none">
          <NavigationMenuList className="flex gap-1">
            <NavigationMenuItem>
              <NavigationMenuTrigger 
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium",
                  navigationState.mainSection === 'interactions' && "bg-accent text-accent-foreground"
                )}
              >
                <MessageSquare className="h-4 w-4" />
                {t('interactions')}
              </NavigationMenuTrigger>
              {renderDropdownContent(interactionsItems, 'interactions')}
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger 
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium",
                  navigationState.mainSection === 'marketing' && "bg-accent text-accent-foreground"
                )}
              >
                <Mail className="h-4 w-4" />
                {t('marketing')}
              </NavigationMenuTrigger>
              {renderDropdownContent(marketingItems, 'marketing')}
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger 
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium",
                  navigationState.mainSection === 'ops' && "bg-accent text-accent-foreground"
                )}
              >
                <Wrench className="h-4 w-4" />
                {t('ops')}
              </NavigationMenuTrigger>
              {renderDropdownContent(opsItems, 'ops')}
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger 
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium",
                  navigationState.mainSection === 'settings' && "bg-accent text-accent-foreground"
                )}
              >
                <SettingsIcon className="h-4 w-4" />
                {t('settings.title')}
              </NavigationMenuTrigger>
              {renderDropdownContent(settingsItems, 'settings')}
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Breadcrumb */}
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

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};

export default MainApp;