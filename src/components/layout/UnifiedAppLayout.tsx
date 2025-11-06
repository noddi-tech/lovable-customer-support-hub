import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppMainNav } from './AppMainNav';
import { AppHeader } from '@/components/dashboard/AppHeader';
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
    <SidebarProvider defaultOpen={false}>
      {import.meta.env.DEV && import.meta.env.VITE_UI_PROBE === '1' && <UIProbe />}
      <div className="h-svh flex w-full bg-white">
        {/* Sidebar Navigation */}
        <AppMainNav />

        {/* Main Content Area */}
        <div className="flex-1 grid grid-rows-[56px_1fr] min-h-0">
          {/* Top Header with full functionality */}
          <AppHeader />

          {/* Main Content */}
          <main className="min-h-0 w-full max-w-none overflow-auto bg-white">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};