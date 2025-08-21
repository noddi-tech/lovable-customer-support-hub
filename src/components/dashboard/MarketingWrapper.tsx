import React from 'react';
import { SMSInterface } from '@/components/dashboard/SMSInterface';
import { NewsletterInterface } from './newsletter/NewsletterInterface';

interface MarketingWrapperProps {
  activeSubSection?: string;
}

const MarketingWrapper: React.FC<MarketingWrapperProps> = ({ activeSubSection = 'email' }) => {
  const renderContent = () => {
    switch (activeSubSection) {
      case 'email':
        return <NewsletterInterface />;
      case 'sms':
        return <SMSInterface />;
      default:
        return <NewsletterInterface />;
    }
  };

  return (
    <div className="h-full">
      {renderContent()}
    </div>
  );
};

export default MarketingWrapper;