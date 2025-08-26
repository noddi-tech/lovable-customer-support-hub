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
    <div className="h-svh grid grid-rows-[auto_1fr] bg-background overflow-hidden">
      {/* Header */}
      <ModernHeader
        activeTab={activeTab}
        activeSubTab={activeSubTab}
        onTabChange={onTabChange}
        onSidebarToggle={handleSidebarToggle}
        showSidebarToggle={isMobile}
      />
      
      {/* Main */}
      <main className="grid grid-cols-[280px_minmax(0,1fr)] min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="bg-muted border-r border-border overflow-auto min-h-0">
          <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <ModernSidebar 
              activeTab={activeTab}
              activeSubTab={activeSubTab}
              onTabChange={onTabChange}
            />
          </SidebarProvider>
        </aside>
        
        {/* Content */}
        <section className="overflow-auto min-h-0 p-4 md:p-6 bg-background">
          <div className="h-full w-full max-w-none">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
};