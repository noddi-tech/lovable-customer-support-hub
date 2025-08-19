import React from 'react';
import { SMSInterface } from '@/components/dashboard/SMSInterface';
import NewsletterBuilder from './NewsletterBuilder';

interface MarketingWrapperProps {
  activeSubSection: string;
}

const MarketingWrapper = ({ activeSubSection }: MarketingWrapperProps) => {
  const renderContent = () => {
    switch (activeSubSection) {
      case 'sms':
        return <SMSInterface />;
      case 'email':
      default:
        return <NewsletterBuilder />;
    }
  };

  return (
    <div className="h-full">
      {renderContent()}
    </div>
  );
};

export default MarketingWrapper;