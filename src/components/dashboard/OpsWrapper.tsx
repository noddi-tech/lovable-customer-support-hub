import React from 'react';
import ServiceTicketsInterface from './ServiceTicketsInterface';
import DoormanInterface from './DoormanInterface';
import RecruitmentInterface from './RecruitmentInterface';

interface OpsWrapperProps {
  activeSubSection: string;
}

const OpsWrapper = ({ activeSubSection }: OpsWrapperProps) => {
  const renderContent = () => {
    switch (activeSubSection) {
      case 'doorman':
        return <DoormanInterface />;
      case 'recruitment':
        return <RecruitmentInterface />;
      case 'serviceTickets':
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