import React from 'react';
import { createRoot } from 'react-dom/client';
import { Widget } from './Widget';
import type { WidgetInitOptions } from './types';
// @ts-ignore - Vite handles this import
import widgetStyles from './styles/widget.css?inline';

// Queue for commands before initialization
declare global {
  interface Window {
    NoddiWidget: {
      q?: any[];
      init?: (options: WidgetInitOptions) => void;
      (command: string, options?: any): void;
    };
    noddi: (command: string, options?: any) => void;
  }
}

console.log('[Noddi] Widget script loaded at', new Date().toISOString());

function injectStyles() {
  const styleId = 'noddi-widget-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = widgetStyles;
    document.head.appendChild(style);
    console.log('[Noddi] Styles injected');
  }
}

function initializeWidget(options: WidgetInitOptions) {
  console.log('[Noddi] initializeWidget called with options:', options);
  
  // Inject CSS styles
  injectStyles();
  
  // Create container for the widget
  const containerId = 'noddi-widget-root';
  
  // Remove existing container if present
  const existing = document.getElementById(containerId);
  if (existing) {
    existing.remove();
    console.log('[Noddi] Removed existing container');
  }
  
  // Create new container
  const container = document.createElement('div');
  container.id = containerId;
  document.body.appendChild(container);
  console.log('[Noddi] Created container:', container);
  
  // Render widget
  const root = createRoot(container);
  root.render(<Widget options={options} />);
  
  console.log('[Noddi] Widget rendered with key:', options.widgetKey);
}

// Process queued commands
function processQueue() {
  const queue = window.NoddiWidget?.q || [];
  console.log('[Noddi] Processing queue:', queue.length, 'commands');
  
  queue.forEach((args: any[]) => {
    const [command, options] = args;
    console.log('[Noddi] Processing command:', command, options);
    if (command === 'init' && options?.widgetKey) {
      initializeWidget(options);
    }
  });
}

// Set up the global API
console.log('[Noddi] Setting up global API');
window.NoddiWidget = Object.assign(
  function(command: string, options?: any) {
    console.log('[Noddi] NoddiWidget called:', command, options);
    if (command === 'init' && options?.widgetKey) {
      initializeWidget(options);
    }
  },
  {
    init: initializeWidget,
    q: window.NoddiWidget?.q || [],
  }
);

// Also support the noddi() shorthand from embed code
window.noddi = function(command: string, options?: any) {
  console.log('[Noddi] noddi() called:', command, options);
  window.NoddiWidget(command, options);
};

console.log('[Noddi] Global API ready, queue length:', window.NoddiWidget.q?.length);

// Process any queued commands
processQueue();
