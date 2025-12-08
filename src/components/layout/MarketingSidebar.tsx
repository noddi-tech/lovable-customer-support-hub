import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter
} from '@/components/ui/sidebar';
import { 
  Megaphone, 
  BarChart3, 
  TrendingUp,
  Mail,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const MarketingSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const marketingItems = [
    {
      title: 'Newsletter Builder',
      path: '/marketing/campaigns',
      icon: Mail
    },
    {
      title: 'Campaigns',
      path: '/marketing/campaigns#list', 
      icon: Megaphone
    },
    {
      title: 'Analytics',
      path: '/marketing/campaigns#analytics',
      icon: BarChart3
    },
    {
      title: 'Performance',
      path: '/marketing/campaigns#performance',
      icon: TrendingUp
    }
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Marketing</SidebarGroupLabel>
          <SidebarMenu>
            {marketingItems.map((item) => {
              const Icon = item.icon;
              const itemPath = item.path.split('#')[0];
              const itemHash = item.path.includes('#') ? '#' + item.path.split('#')[1] : '';
              const itemIsActive = location.pathname === itemPath && 
                (itemHash ? location.hash === itemHash : !location.hash);
              
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={itemIsActive}
                  >
                    <Link to={item.path}>
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/interactions/text')}
          className="w-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};