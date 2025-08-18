import React from 'react';
import MainApp from './MainApp';

const Index = () => {
  // Show main app for authenticated users (auth is handled by ProtectedRoute)
  return <MainApp />;
};

export default Index;