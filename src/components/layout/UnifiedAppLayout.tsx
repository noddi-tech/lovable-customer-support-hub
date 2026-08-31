import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppMainNav } from './AppMainNav';
import { SearchCommandPalette } from '@/components/search/SearchCommandPalette';
import { QuickInboxSwitcher } from './QuickInboxSwitcher';
import { UIProbe } from '@/dev/UIProbe';
import { useDesktopEmailNotifications } from '@/hooks/useDesktopEmailNotifications';
import { useNotificationPermissionPrompt } from '@/hooks/useNotificationPermissionPrompt';
import { useOpenConversationsBadge } from '@/hooks/useOpenConversationsBadge';
import { WhatsNewDialog } from '@/features/whats-new/WhatsNewDialog';

interface UnifiedAppLayoutProps {
  children: React.ReactNode;
}

export const UnifiedAppLayout: React.FC<UnifiedAppLayoutProps> = ({
  children
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [inboxSwitcherOpen, setInboxSwitcherOpen] = useState(false);
  const location = useLocation();
  const section = location.pathname.split('/').slice(0, 3).join('/');

  // Ask for browser notification permission on first app open (top-level only)
  useNotificationPermissionPrompt();

  // Desktop notifications for newly arrived emails and chat messages
  useDesktopEmailNotifications();

  // Favicon / app badge with open conversations in the selected inbox
  useOpenConversationsBadge();

  // Global Cmd+K / Ctrl+K (search) and Cmd+I / Ctrl+I (quick inbox switcher)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if ((e.key === 'i' || e.key === 'I') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setInboxSwitcherOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  return (
    <SidebarProvider defaultOpen={false}>
      {import.meta.env.DEV && import.meta.env.VITE_UI_PROBE === '1' && <UIProbe />}
      <SearchCommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <QuickInboxSwitcher open={inboxSwitcherOpen} onOpenChange={setInboxSwitcherOpen} />

      <div className="h-svh flex w-full bg-background">
        {/* Sidebar Navigation */}
        <AppMainNav />

        {/* Main Content Area */}
        <main className="flex-1 min-h-0 w-full max-w-none overflow-auto bg-background">
          <div key={section} className="h-full animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
