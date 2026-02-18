import React from 'react';
import { createRoot } from 'react-dom/client';
import { Widget, WidgetAPI } from './Widget';
import type { WidgetInitOptions } from './types';
// @ts-ignore - Vite handles this import
import widgetStyles from './styles/widget.css?inline';

// Store widget API reference for programmatic control
let widgetAPI: WidgetAPI | null = null;
let pendingCommands: Array<() => void> = [];
let initOptions: WidgetInitOptions | null = null;

// Queue for commands before initialization
declare global {
  interface Window {
    NoddiWidget: {
      q?: any[];
      init?: (options: WidgetInitOptions) => void;
      open?: () => void;
      close?: () => void;
      toggle?: () => void;
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
  initOptions = options;
  
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
  
  // Render widget with onMount callback to get API reference
  const root = createRoot(container);
  root.render(
    <Widget 
      options={options} 
      onMount={(api) => {
        widgetAPI = api;
        console.log('[Noddi] Widget API mounted, flushing', pendingCommands.length, 'pending commands');
        pendingCommands.forEach(cmd => cmd());
        pendingCommands = [];
        if (initOptions?.onReady) {
          initOptions.onReady();
        }
      }}
    />
  );
  
  console.log('[Noddi] Widget rendered with key:', options.widgetKey);
}

// Programmatic control functions
function openWidget() {
  if (widgetAPI) {
    console.log('[Noddi] Opening widget programmatically');
    widgetAPI.setIsOpen(true);
  } else {
    console.log('[Noddi] Queuing open command (widget not ready yet)');
    pendingCommands.push(() => widgetAPI!.setIsOpen(true));
  }
}

function closeWidget() {
  if (widgetAPI) {
    console.log('[Noddi] Closing widget programmatically');
    widgetAPI.setIsOpen(false);
  } else {
    console.log('[Noddi] Queuing close command (widget not ready yet)');
    pendingCommands.push(() => widgetAPI!.setIsOpen(false));
  }
}

function toggleWidget() {
  if (widgetAPI) {
    console.log('[Noddi] Toggling widget programmatically');
    widgetAPI.toggle();
  } else {
    console.log('[Noddi] Queuing toggle command (widget not ready yet)');
    pendingCommands.push(() => widgetAPI!.toggle());
  }
}

// Process queued commands
function processQueue() {
  const queue = window.NoddiWidget?.q || [];
  console.log('[Noddi] Processing queue:', queue.length, 'commands');
  
  queue.forEach((args: any[]) => {
    const [command, options] = args;
    console.log('[Noddi] Processing command:', command, options);
    handleCommand(command, options);
  });
}

// Centralized command handler
function handleCommand(command: string, options?: any) {
  switch (command) {
    case 'init':
      if (options?.widgetKey) {
        initializeWidget(options);
      }
      break;
    case 'open':
      openWidget();
      break;
    case 'close':
      closeWidget();
      break;
    case 'toggle':
      toggleWidget();
      break;
    default:
      console.warn('[Noddi] Unknown command:', command);
  }
}

// Set up the global API
console.log('[Noddi] Setting up global API');
window.NoddiWidget = Object.assign(
  function(command: string, options?: any) {
    console.log('[Noddi] NoddiWidget called:', command, options);
    handleCommand(command, options);
  },
  {
    init: initializeWidget,
    open: openWidget,
    close: closeWidget,
    toggle: toggleWidget,
    q: window.NoddiWidget?.q || [],
  }
);

// Also support the noddi() shorthand from embed code
window.noddi = function(command: string, options?: any) {
  console.log('[Noddi] noddi() called:', command, options);
  handleCommand(command, options);
};

console.log('[Noddi] Global API ready, queue length:', window.NoddiWidget.q?.length);

// Process any queued commands
processQueue();
