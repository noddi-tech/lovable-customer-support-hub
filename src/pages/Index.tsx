import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppRoot, AppHeader, AppMain, AppNav } from '@/components/layout';
import InteractionsWrapper from '@/components/dashboard/InteractionsWrapper';
import MarketingWrapper from '@/components/dashboard/MarketingWrapper';
import OpsWrapper from '@/components/dashboard/OpsWrapper';

const Index = () => {
  return (
    <AppRoot>
      <AppHeader />
      <AppMain>
        <AppNav />
        <Routes>
          <Route path="/" element={<Navigate to="/interactions" replace />} />
          <Route path="/interactions/*" element={<InteractionsWrapper />} />
          <Route path="/marketing/*" element={<MarketingWrapper />} />
          <Route path="/ops/*" element={<OpsWrapper />} />
        </Routes>
      </AppMain>
    </AppRoot>
  );
};

export default Index;