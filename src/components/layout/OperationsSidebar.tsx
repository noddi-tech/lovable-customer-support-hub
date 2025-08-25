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
  Ticket, 
  DoorOpen, 
  Users,
  BarChart3,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const OperationsSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const operationsItems = [
    {
      title: 'Service Tickets',
      path: '/operations',
      icon: Ticket
    },
    {
      title: 'Doorman Interface',
      path: '/operations/doorman',
      icon: DoorOpen
    },
    {
      title: 'Recruitment',
      path: '/operations/recruitment',
      icon: Users
    },
    {
      title: 'Operations Analytics',
      path: '/operations/analytics',
      icon: BarChart3
    },
    {
      title: 'Operations Settings',
      path: '/operations/settings',
      icon: Settings
    }
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarMenu>
            {operationsItems.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive(item.path)}
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
          onClick={() => navigate('/')}
          className="w-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};