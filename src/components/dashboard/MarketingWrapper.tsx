import React from 'react';
import { SMSInterface } from '@/components/dashboard/SMSInterface';
import NewsletterBuilder from './NewsletterBuilder';

interface MarketingWrapperProps {
  activeSubSection?: string;
}

const MarketingWrapper: React.FC<MarketingWrapperProps> = ({ activeSubSection = 'email' }) => {
  const renderContent = () => {
    switch (activeSubSection) {
      case 'email':
        return <NewsletterBuilder />;
      case 'sms':
        return <SMSInterface />;
      default:
        return <NewsletterBuilder />;
    }
  };

  return (
    <div className="h-full min-h-0 overflow-hidden">
      {renderContent()}
    </div>
  );
};

export default MarketingWrapper;