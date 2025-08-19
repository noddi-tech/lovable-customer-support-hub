import React from 'react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { VoiceInterface } from '@/components/dashboard/VoiceInterface';

interface InteractionsWrapperProps {
  activeSubSection: string;
}

const InteractionsWrapper = ({ activeSubSection }: InteractionsWrapperProps) => {
  const renderContent = () => {
    switch (activeSubSection) {
      case 'voice':
        return <VoiceInterface />;
      case 'text':
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-full">
      {renderContent()}
    </div>
  );
};

export default InteractionsWrapper;