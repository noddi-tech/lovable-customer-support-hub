import React, { useEffect, useRef } from 'react';

const DoormanInterface = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Suppress postMessage errors from iframe
    const handleWindowError = (event: ErrorEvent) => {
      if (event.message?.includes('postMessage') || 
          event.message?.includes('noddi.co') ||
          event.message?.includes('cross-origin')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    window.addEventListener('error', handleWindowError, true);
    
    return () => {
      window.removeEventListener('error', handleWindowError, true);
    };
  }, []);

  return (
    <div className="w-full h-full">
      <iframe
        ref={iframeRef}
        src="https://doorman.noddi.co/"
        className="w-full h-full border-0"
        title="Doorman Service"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        allow="fullscreen"
        loading="lazy"
      />
    </div>
  );
};

export default DoormanInterface;