import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { 
  Search,
  Bell,
  User,
  RefreshCw
} from 'lucide-react';
import { AppMainNav } from './AppMainNav';
import { UIProbe } from '@/dev/UIProbe';

interface UnifiedAppLayoutProps {
  children: React.ReactNode;
}

export const UnifiedAppLayout: React.FC<UnifiedAppLayoutProps> = ({
  children
}) => {

  // (Optional) Keep this only for local dev and only when explicitly enabled
  // React.useEffect(() => {
  //   if (import.meta.env.DEV && import.meta.env.VITE_LAYOUT_DOCTOR === '1') {
  //     const root = document.getElementById('interactions-root') ?? document.body;
  //     const offenders: Element[] = [];
  //     root.querySelectorAll<HTMLElement>('*').forEach(el => {
  //       const cs = getComputedStyle(el);
  //       const mw = parseFloat(cs.maxWidth);
  //       if ((cs.marginLeft === 'auto' && cs.marginRight === 'auto') ||
  //           (!Number.isNaN(mw) && mw > 0 && mw < window.innerWidth - 40)) {
  //         offenders.push(el);
  //       }
  //     });
  //     // eslint-disable-next-line no-console
  //     console.log('Clamp offenders:', offenders.map(e => ({class: e.className, id: e.id})));
  //   }
  // }, []);

  return (
    <SidebarProvider>
      <UIProbe />
      <div className="h-svh flex w-full bg-background">
        {/* Sidebar Navigation */}
        <AppMainNav />

        {/* Main Content Area */}
        <div className="flex-1 grid grid-rows-[56px_1fr] min-h-0">
          {/* Top Header */}
          <header className="bg-muted border-b border-border">
            <div className="flex h-full items-center px-4 shadow-sm">
              <div className="flex items-center gap-4 w-full h-full">
                {/* Sidebar trigger and Logo */}
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="mr-2" />
                  <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-semibold text-sm">CS</span>
                  </div>
                  <span className="font-semibold text-foreground hidden sm:block">Customer Support Hub</span>
                </div>
                
                {/* Spacer */}
                <div className="flex-1" />

                {/* Right side actions */}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content with gutters */}
          <main className="min-h-0 w-full max-w-none overflow-auto px-4 sm:px-6 md:px-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};