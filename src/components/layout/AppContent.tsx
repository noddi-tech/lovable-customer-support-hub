import React from 'react';

interface AppContentProps {
  children: React.ReactNode;
  className?: string;
}

export function AppContent({
  className = "",
  children,
}: AppContentProps) {
  return (
    <div className={`w-full max-w-none min-h-0 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 ${className}`}>
      {children}
    </div>
  );
}