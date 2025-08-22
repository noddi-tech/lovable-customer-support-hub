import React from 'react';
import { PerformanceTestIndicator } from './PerformanceTestIndicator';

export const PerformanceStatus: React.FC = () => {
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <PerformanceTestIndicator />
    </div>
  );
};