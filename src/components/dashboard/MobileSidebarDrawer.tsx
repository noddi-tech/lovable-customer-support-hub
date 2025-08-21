import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { OptimizedInteractionsSidebar } from './OptimizedInteractionsSidebar';
import { SidebarStateManager } from '@/components/ui/sidebar-state-manager';

interface MobileSidebarDrawerProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  activeTab?: string;
}

export const MobileSidebarDrawer: React.FC<MobileSidebarDrawerProps> = ({
  selectedTab,
  onTabChange,
  activeTab = 'interactions'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setIsOpen(false); // Close drawer after selection
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="p-0 w-80">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-left">Navigation</SheetTitle>
        </SheetHeader>
        
        <div className="h-full overflow-hidden">
          <SidebarStateManager initialTab={selectedTab}>
            <OptimizedInteractionsSidebar 
              selectedTab={selectedTab}
              onTabChange={handleTabChange}
            />
          </SidebarStateManager>
        </div>
      </SheetContent>
    </Sheet>
  );
};