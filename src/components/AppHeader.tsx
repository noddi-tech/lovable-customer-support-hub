import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MessageCircle, Megaphone, Wrench, Settings, ChevronDown, Phone, Mail, MessageSquare, Ticket, DoorOpen, Users, User, Bell, Shield } from 'lucide-react';

interface AppHeaderProps {
  activeTab: string;
  activeSubTab: string;
  onTabChange: (tab: string, subTab: string) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ activeTab, activeSubTab, onTabChange }) => {
  const getTabConfig = () => {
    switch (activeTab) {
      case 'interactions':
        return {
          icon: MessageCircle,
          label: 'Interactions',
          subTabs: [
            { key: 'text', label: 'Text', icon: MessageCircle },
            { key: 'voice', label: 'Voice', icon: Phone }
          ]
        };
      case 'marketing':
        return {
          icon: Megaphone,
          label: 'Marketing',
          subTabs: [
            { key: 'email', label: 'Email', icon: Mail },
            { key: 'sms', label: 'SMS', icon: MessageSquare }
          ]
        };
      case 'ops':
        return {
          icon: Wrench,
          label: 'Ops',
          subTabs: [
            { key: 'serviceTickets', label: 'Service Tickets', icon: Ticket },
            { key: 'doorman', label: 'Doorman', icon: DoorOpen },
            { key: 'recruitment', label: 'Recruitment', icon: Users }
          ]
        };
      case 'settings':
        return {
          icon: Settings,
          label: 'Settings',
          subTabs: [
            { key: 'general', label: 'General', icon: Settings },
            { key: 'profile', label: 'Profile', icon: User },
            { key: 'notifications', label: 'Notifications', icon: Bell },
            { key: 'email-templates', label: 'Email Templates', icon: Mail },
            { key: 'users', label: 'Users', icon: Users },
            { key: 'admin', label: 'Admin', icon: Shield }
          ]
        };
      default:
        return null;
    }
  };

  const currentConfig = getTabConfig();
  const currentSubTab = currentConfig?.subTabs.find(sub => sub.key === activeSubTab);

  return (
    <header className="h-14 border-b bg-background border-border sticky top-0 z-50">
      <div className="flex h-full items-center px-4 gap-4">
        {/* Main Tab Navigation */}
        <div className="flex gap-2">
          {['interactions', 'marketing', 'ops', 'settings'].map((tab) => {
            const config = (() => {
              switch (tab) {
                case 'interactions': return { icon: MessageCircle, label: 'Interactions' };
                case 'marketing': return { icon: Megaphone, label: 'Marketing' };
                case 'ops': return { icon: Wrench, label: 'Ops' };
                case 'settings': return { icon: Settings, label: 'Settings' };
                default: return null;
              }
            })();
            
            if (!config) return null;
            
            const Icon = config.icon;
            const isActive = activeTab === tab;
            
            return (
              <Button
                key={tab}
                variant={isActive ? "default" : "ghost"}
                className="h-10"
                onClick={() => {
                  const defaultSubTabs = {
                    interactions: 'text',
                    marketing: 'email', 
                    ops: 'serviceTickets',
                    settings: 'general'
                  };
                  onTabChange(tab, defaultSubTabs[tab as keyof typeof defaultSubTabs]);
                }}
              >
                <Icon className="h-4 w-4 mr-2" />
                {config.label}
              </Button>
            );
          })}
        </div>

        {/* Sub Tab Dropdown */}
        {currentConfig && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10">
                {currentSubTab && <currentSubTab.icon className="h-4 w-4 mr-2" />}
                {currentSubTab?.label || 'Select'}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 bg-background border-border">
              {currentConfig.subTabs.map((subTab) => (
                <DropdownMenuItem
                  key={subTab.key}
                  onClick={() => onTabChange(activeTab, subTab.key)}
                  className={activeSubTab === subTab.key ? 'bg-muted' : ''}
                >
                  <subTab.icon className="h-4 w-4 mr-2" />
                  {subTab.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default AppHeader;