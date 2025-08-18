import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppRoot, AppHeader, AppMain, AppSidebar, ResponsiveLayout, MobileNavigation } from '@/components/layout';
import { ResponsiveProvider, useResponsive } from '@/contexts/ResponsiveContext';
import { useAccessibleNavigation } from '@/hooks/useAccessibleNavigation';
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';
import { PerformanceMonitor } from '@/components/ui/performance-monitor';
import { TestRunner } from '@/components/testing/TestRunner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import InteractionsWrapper from '@/components/dashboard/InteractionsWrapper';
import MarketingWrapper from '@/components/dashboard/MarketingWrapper';
import OpsWrapper from '@/components/dashboard/OpsWrapper';

const IndexContent = () => {
  const { isMobile, showInspector, setShowInspector } = useResponsive();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [showTestRunner, setShowTestRunner] = useState(false);
  const navigate = useNavigate();

  useAccessibleNavigation({
    onShowShortcuts: () => setShowShortcuts(true),
    onToggleInspector: () => setShowInspector(!showInspector),
    onNavigateToSection: (section) => {
      navigate(`/${section}`);
    }
  });

  // Additional keyboard shortcuts for development
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setShowPerformance(true);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        setShowTestRunner(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

        <Dialog open={showTestRunner} onOpenChange={setShowTestRunner}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Test Runner</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh]">
              <TestRunner />
            </div>
          </DialogContent>
        </Dialog>

        <PerformanceMonitor show={showPerformance} onClose={() => setShowPerformance(false)} />
      </>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/interactions" replace />} />
          <Route path="/interactions/*" element={<InteractionsWrapper />} />
          <Route path="/marketing/*" element={<MarketingWrapper />} />
          <Route path="/ops/*" element={<OpsWrapper />} />
        </Routes>
      </div>
      
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <KeyboardShortcutsHelp />
        </DialogContent>
      </Dialog>

      <Dialog open={showTestRunner} onOpenChange={setShowTestRunner}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Test Runner & Validation</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            <TestRunner />
          </div>
        </DialogContent>
      </Dialog>

      <PerformanceMonitor show={showPerformance} onClose={() => setShowPerformance(false)} />
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