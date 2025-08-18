import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppRoot, AppHeader, AppMain, AppSidebar, ResponsiveLayout, MobileNavigation } from '@/components/layout';
import { ResponsiveProvider, useResponsive } from '@/contexts/ResponsiveContext';
import { useAccessibleNavigation } from '@/hooks/useAccessibleNavigation';
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InteractionsWrapper from '@/components/dashboard/InteractionsWrapper';
import MarketingWrapper from '@/components/dashboard/MarketingWrapper';
import OpsWrapper from '@/components/dashboard/OpsWrapper';

const IndexContent = () => {
  const { isMobile, showInspector, setShowInspector } = useResponsive();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const navigate = useNavigate();

  useAccessibleNavigation({
    onShowShortcuts: () => setShowShortcuts(true),
    onToggleInspector: () => setShowInspector(!showInspector),
    onNavigateToSection: (section) => {
      navigate(`/${section}`);
    }
  });

  if (isMobile) {
    return (
      <>
        <MobileNavigation
          interactions={<InteractionsWrapper />}
          marketing={<MarketingWrapper />}
          ops={<OpsWrapper />}
        />
        
        <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Keyboard Shortcuts</DialogTitle>
            </DialogHeader>
            <KeyboardShortcutsHelp />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <ResponsiveLayout
        sidebar={<AppSidebar />}
        main={
          <div className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/interactions" replace />} />
              <Route path="/interactions/*" element={<InteractionsWrapper />} />
              <Route path="/marketing/*" element={<MarketingWrapper />} />
              <Route path="/ops/*" element={<OpsWrapper />} />
            </Routes>
          </div>
        }
      />
      
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <KeyboardShortcutsHelp />
        </DialogContent>
      </Dialog>
    </>
  );
};

const Index = () => {
  return (
    <ResponsiveProvider>
      <AppRoot>
        <AppHeader />
        <AppMain>
          <IndexContent />
        </AppMain>
      </AppRoot>
    </ResponsiveProvider>
  );
};

export default Index;