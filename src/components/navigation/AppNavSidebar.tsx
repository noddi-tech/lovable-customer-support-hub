import React from 'react';
import { NavLink } from 'react-router-dom';
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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface AppNavSidebarProps {
  navigationState: {
    mainSection: string;
    subSection: string;
  };
  onNavigate: (mainSection: string, subSection: string) => void;
}

export function AppNavSidebar({ navigationState, onNavigate }: AppNavSidebarProps) {
  const { state } = useSidebar();
  const { t } = useTranslation();

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

  const isActive = (mainSection: string, subSection: string) => 
    navigationState.mainSection === mainSection && navigationState.subSection === subSection;

  const isCollapsed = state === 'collapsed';

  const renderMenuItems = (items: any[], mainSection: string, groupLabel: string) => (
    <SidebarGroup>
      <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton
                onClick={() => onNavigate(mainSection, item.key)}
                className={cn(
                  "flex items-center gap-2 w-full",
                  isActive(mainSection, item.key) && "bg-accent text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {!isCollapsed && <span>{item.label}</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        {renderMenuItems(interactionsItems, 'interactions', t('interactions'))}
        {renderMenuItems(marketingItems, 'marketing', t('marketing'))}
        {renderMenuItems(opsItems, 'ops', t('ops'))}
        {renderMenuItems(settingsItems, 'settings', t('settings.title'))}
      </SidebarContent>
    </Sidebar>
  );
}