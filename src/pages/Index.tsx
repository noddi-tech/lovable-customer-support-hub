import React, { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import MainApp from './MainApp';

const Index = () => {
  const [activeTab, setActiveTab] = useState('interactions');

  return (
    <div className="min-h-screen">
      <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />
      <MainApp activeTab={activeTab} />
    </div>
  );
};

export default Index;