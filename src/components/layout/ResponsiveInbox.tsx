import React, { useState } from 'react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileDrawer } from '@/components/ui/mobile-drawer';
import { BottomTabs, type TabItem } from '@/components/ui/bottom-tabs';
import { MessageSquare, Users, Briefcase, Settings, Inbox } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const ResponsiveInbox: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMainSection, setActiveMainSection] = useState('interactions');

  // iPhone bottom tabs for main navigation
  const bottomTabItems: TabItem[] = [
    {
      id: 'interactions',
      label: 'Inbox',
      icon: <Inbox className="h-5 w-5" />,
      onClick: () => {
        setActiveMainSection('interactions');
        navigate('/');
      }
    },
    {
      id: 'marketing',
      label: 'Marketing',
      icon: <MessageSquare className="h-5 w-5" />,
      onClick: () => {
        setActiveMainSection('marketing');
        navigate('/marketing');
      }
    },
    {
      id: 'ops',
      label: 'Operations',
      icon: <Briefcase className="h-5 w-5" />,
      onClick: () => {
        setActiveMainSection('ops');
        navigate('/ops');
      }
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />,
      onClick: () => {
        setActiveMainSection('settings');
        navigate('/settings');
      }
    }
  ];

  // Determine active tab based on current route
  const getCurrentActiveTab = () => {
    if (location.pathname.startsWith('/marketing')) return 'marketing';
    if (location.pathname.startsWith('/ops')) return 'ops';
    if (location.pathname.startsWith('/settings')) return 'settings';
    return 'interactions';
  };

  return (
    <div className="app-root">
      {/* Main Dashboard */}
      <Dashboard />
      
      {/* iPhone Bottom Tabs - Only show on iPhone (≤600px) */}
      {isMobile && window.innerWidth <= 600 && (
        <BottomTabs 
          items={bottomTabItems}
          activeTab={getCurrentActiveTab()}
          className="md:hidden"
        />
      )}
    </div>
  );
};

export default ResponsiveInbox;