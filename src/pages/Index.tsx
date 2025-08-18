import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppRoot, AppHeader, AppMain, AppSidebar } from '@/components/layout';
import InteractionsWrapper from '@/components/dashboard/InteractionsWrapper';
import MarketingWrapper from '@/components/dashboard/MarketingWrapper';
import OpsWrapper from '@/components/dashboard/OpsWrapper';

const Index = () => {
  return (
    <AppRoot>
      <AppHeader />
      <AppMain>
        <AppSidebar />
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/interactions" replace />} />
            <Route path="/interactions/*" element={<InteractionsWrapper />} />
            <Route path="/marketing/*" element={<MarketingWrapper />} />
            <Route path="/ops/*" element={<OpsWrapper />} />
          </Routes>
        </div>
      </AppMain>
    </AppRoot>
  );
};

export default Index;