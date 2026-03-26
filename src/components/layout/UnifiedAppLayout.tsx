import React, { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppMainNav } from './AppMainNav';
import { SearchCommandPalette } from '@/components/search/SearchCommandPalette';
import { UIProbe } from '@/dev/UIProbe';
import { useIsMobile } from '@/hooks/use-responsive';

interface UnifiedAppLayoutProps {
  children: React.ReactNode;
}

export const UnifiedAppLayout: React.FC<UnifiedAppLayoutProps> = ({
  children
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const isMobile = useIsMobile();

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  return (
    <SidebarProvider defaultOpen={false}>
      {import.meta.env.DEV && import.meta.env.VITE_UI_PROBE === '1' && <UIProbe />}
      <SearchCommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <div className="h-svh flex w-full bg-background">
        {/* Sidebar Navigation */}
        <AppMainNav />

        {/* Main Content Area — no header row */}
        <main className="flex-1 min-h-0 w-full max-w-none overflow-auto bg-background">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};
