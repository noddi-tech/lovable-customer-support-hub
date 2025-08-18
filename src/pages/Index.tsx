import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppRoot, AppHeader, AppMain, AppSidebar, ResponsiveLayout, MobileNavigation } from '@/components/layout';
import { ResponsiveProvider, useResponsive } from '@/contexts/ResponsiveContext';
import InteractionsWrapper from '@/components/dashboard/InteractionsWrapper';
import MarketingWrapper from '@/components/dashboard/MarketingWrapper';
import OpsWrapper from '@/components/dashboard/OpsWrapper';

const IndexContent = () => {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <MobileNavigation
        interactions={<InteractionsWrapper />}
        marketing={<MarketingWrapper />}
        ops={<OpsWrapper />}
      />
    );
  }

  return (
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