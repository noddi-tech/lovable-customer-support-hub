import React, { createContext, useContext, useState, useEffect } from 'react';

interface ResponsiveContextType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  breakpoint: 'mobile' | 'tablet' | 'desktop' | 'large-desktop';
  showInspector: boolean;
  setShowInspector: (show: boolean) => void;
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

export const useResponsive = () => {
  const context = useContext(ResponsiveContext);
  if (!context) {
    throw new Error('useResponsive must be used within a ResponsiveProvider');
  }
  return context;
};

interface ResponsiveProviderProps {
  children: React.ReactNode;
}

export const ResponsiveProvider = ({ children }: ResponsiveProviderProps) => {
  const [windowWidth, setWindowWidth] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [showInspector, setShowInspector] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-hide inspector on smaller screens
  useEffect(() => {
    if (windowWidth < 992) {
      setShowInspector(false);
    } else if (windowWidth >= 1200) {
      setShowInspector(true);
    }
  }, [windowWidth]);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 992;
  const isDesktop = windowWidth >= 992 && windowWidth < 1200;
  const isLargeDesktop = windowWidth >= 1200;

  const breakpoint = isMobile 
    ? 'mobile' 
    : isTablet 
    ? 'tablet' 
    : isDesktop 
    ? 'desktop' 
    : 'large-desktop';

  return (
    <ResponsiveContext.Provider
      value={{
        isMobile,
        isTablet,
        isDesktop,
        isLargeDesktop,
        breakpoint,
        showInspector,
        setShowInspector,
      }}
    >
      {children}
    </ResponsiveContext.Provider>
  );
};