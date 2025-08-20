import React from 'react';
import InteractionsWrapper from '@/components/dashboard/InteractionsWrapper';
import MarketingWrapper from '@/components/dashboard/MarketingWrapper';
import OpsWrapper from '@/components/dashboard/OpsWrapper';
import SettingsWrapper from '@/components/dashboard/SettingsWrapper';

interface MainAppProps {
  activeTab: string;
}

const MainApp: React.FC<MainAppProps> = ({ activeTab }) => {

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'interactions':
        return <InteractionsWrapper />;
      case 'marketing':
        return <MarketingWrapper />;
      case 'ops':
        return <OpsWrapper />;
      case 'settings':
        return <SettingsWrapper />;
      default:
        return <InteractionsWrapper />;
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      <div className="flex-1 p-4">
        {renderActiveContent()}
      </div>
    </div>
  );
};

export default MainApp;