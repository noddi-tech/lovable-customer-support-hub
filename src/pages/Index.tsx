import React from 'react';
import { Dashboard } from '@/components/dashboard/Dashboard';

const Index = () => {
  // Show dashboard for authenticated users (auth is handled by ProtectedRoute)
  return <Dashboard />;
};

export default Index;