import React, { useState, useEffect } from 'react';
import type { WidgetConfig, WidgetInitOptions } from './types';
import { fetchWidgetConfig, setApiUrl } from './api';
import { FloatingButton } from './components/FloatingButton';
import { WidgetPanel } from './components/WidgetPanel';
import './styles/widget.css';

interface WidgetProps {
  options: WidgetInitOptions;
}

export const Widget: React.FC<WidgetProps> = ({ options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (options.apiUrl) {
      setApiUrl(options.apiUrl);
    }

    const loadConfig = async () => {
      setIsLoading(true);
      const widgetConfig = await fetchWidgetConfig(options.widgetKey);
      
      if (widgetConfig) {
        setConfig(widgetConfig);
        setError(null);
      } else {
        setError('Failed to load widget configuration');
      }
      
      setIsLoading(false);
    };

    loadConfig();
  }, [options.widgetKey, options.apiUrl]);

  // Don't render anything while loading or on error
  if (isLoading || error || !config) {
    return null;
  }

  return (
    <div className="noddi-widget-container">
      {isOpen && (
        <WidgetPanel 
          config={config} 
          onClose={() => setIsOpen(false)} 
        />
      )}
      <FloatingButton
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        primaryColor={config.primaryColor}
        position={config.position}
      />
    </div>
  );
};
