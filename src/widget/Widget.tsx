import React, { useState, useEffect } from 'react';
import type { WidgetConfig, WidgetInitOptions } from './types';
import { fetchWidgetConfig, setApiUrl } from './api';
import { FloatingButton } from './components/FloatingButton';
import { WidgetPanel } from './components/WidgetPanel';
import './styles/widget.css';

// API interface for programmatic control
export interface WidgetAPI {
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
}

interface WidgetProps {
  options: WidgetInitOptions;
  onMount?: (api: WidgetAPI) => void;
}

export const Widget: React.FC<WidgetProps> = ({ options, onMount }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expose API for programmatic control
  useEffect(() => {
    if (onMount) {
      onMount({
        setIsOpen,
        toggle: () => setIsOpen(prev => !prev),
      });
    }
  }, [onMount]);

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

  // Apply position override from init options, or fall back to config
  const effectivePosition = options.position ?? config.position;
  
  // Determine if button should be shown (default: true)
  const showButton = options.showButton !== false;

  return (
    <div className="noddi-widget-container">
      {isOpen && (
        <WidgetPanel 
          config={config} 
          onClose={() => setIsOpen(false)}
          positionOverride={effectivePosition}
        />
      )}
      {showButton && (
        <FloatingButton
          isOpen={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          primaryColor={config.primaryColor}
          position={effectivePosition}
        />
      )}
    </div>
  );
};
