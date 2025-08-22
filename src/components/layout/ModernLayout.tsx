import React, { useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { ModernAppShell } from './ModernAppShell';
import { ModernHeader } from './ModernHeader';
import { ModernSidebar } from './ModernSidebar';
import { ModernMainContent } from './ModernMainContent';
import { useIsMobile } from '@/hooks/use-responsive';
import { ResponsiveFlex } from '@/components/admin/design/components/layouts';

interface ModernLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  activeSubTab: string;
  onTabChange: (tab: string, subTab: string) => void;
}

export const ModernLayout: React.FC<ModernLayoutProps> = ({
  children,
  activeTab,
  activeSubTab,
  onTabChange
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <ModernAppShell>
        <ResponsiveFlex className="h-full" wrap={false}>
          <ModernSidebar 
            activeTab={activeTab}
            activeSubTab={activeSubTab}
            onTabChange={onTabChange}
          />
          
          <SidebarInset className="flex flex-col flex-1 min-w-0">
            <ModernHeader
              activeTab={activeTab}
              activeSubTab={activeSubTab}
              onTabChange={onTabChange}
              onSidebarToggle={handleSidebarToggle}
              showSidebarToggle={isMobile}
            />
            
            <ModernMainContent>
              {children}
            </ModernMainContent>
          </SidebarInset>
        </ResponsiveFlex>
      </ModernAppShell>
    </SidebarProvider>
  );
};