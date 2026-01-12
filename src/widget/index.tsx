import React from 'react';
import { createRoot } from 'react-dom/client';
import { Widget } from './Widget';
import type { WidgetInitOptions } from './types';

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

function initializeWidget(options: WidgetInitOptions) {
  // Create container for the widget
  const containerId = 'noddi-widget-root';
  
  // Remove existing container if present
  const existing = document.getElementById(containerId);
  if (existing) {
    existing.remove();
  }
  
  // Create new container
  const container = document.createElement('div');
  container.id = containerId;
  document.body.appendChild(container);
  
  // Render widget
  const root = createRoot(container);
  root.render(<Widget options={options} />);
  
  console.log('[Noddi Widget] Initialized with key:', options.widgetKey);
}

// Process queued commands
function processQueue() {
  const queue = window.NoddiWidget?.q || [];
  
  queue.forEach((args: any[]) => {
    const [command, options] = args;
    if (command === 'init' && options?.widgetKey) {
      initializeWidget(options);
    }
  });
}

// Set up the global API
window.NoddiWidget = Object.assign(
  function(command: string, options?: any) {
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
  window.NoddiWidget(command, options);
};

// Process any queued commands
processQueue();
