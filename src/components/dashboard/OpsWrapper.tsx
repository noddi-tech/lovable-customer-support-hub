import React from 'react';
import ServiceTicketsInterface from './ServiceTicketsInterface';
import RecruitmentInterface from './RecruitmentInterface';

interface OpsWrapperProps {
  activeSubSection?: string;
}

const OpsWrapper: React.FC<OpsWrapperProps> = ({ activeSubSection = 'serviceTickets' }) => {
  const renderContent = () => {
    switch (activeSubSection) {
      case 'serviceTickets':
        return <ServiceTicketsInterface />;
      case 'recruitment':
        return <RecruitmentInterface />;
      default:
        return <ServiceTicketsInterface />;
    }
  };

  return (
    <div className="h-full">
      {renderContent()}
    </div>
  );
};

export default OpsWrapper;