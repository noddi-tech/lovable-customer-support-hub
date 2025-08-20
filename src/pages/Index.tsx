import React, { useState } from 'react';
import MainApp from './MainApp';

const Index = () => {
  const [activeTab, setActiveTab] = useState('interactions');
  const [activeSubTab, setActiveSubTab] = useState('text');

  const handleTabChange = (tab: string, subTab: string) => {
    setActiveTab(tab);
    setActiveSubTab(subTab);
  };

  return (
    <div className="min-h-screen">
      <MainApp activeTab={activeTab} activeSubTab={activeSubTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Index;