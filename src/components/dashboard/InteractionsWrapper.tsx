import React from 'react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { VoiceInterface } from '@/components/dashboard/VoiceInterface';

interface InteractionsWrapperProps {
  activeSubSection?: string;
}

const InteractionsWrapper: React.FC<InteractionsWrapperProps> = ({ activeSubSection = 'text' }) => {
  const renderContent = () => {
    switch (activeSubSection) {
      case 'text':
        return <Dashboard activeMainTab="interactions" activeSubTab="text" onMainTabChange={() => {}} />;
      case 'voice':
        return <VoiceInterface />;
      default:
        return <Dashboard activeMainTab="interactions" activeSubTab="text" onMainTabChange={() => {}} />;
    }
  };

  return (
    <div className="h-full">
      {renderContent()}
    </div>
  );
};

export default InteractionsWrapper;