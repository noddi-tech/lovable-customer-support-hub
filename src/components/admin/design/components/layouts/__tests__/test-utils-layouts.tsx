import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Mock window.matchMedia for responsive testing
export const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

// Viewport simulation functions
export const setMobileViewport = () => {
  mockMatchMedia(false);
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  });
};

export const setTabletViewport = () => {
  mockMatchMedia(true);
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 768,
  });
};

export const setDesktopViewport = () => {
  mockMatchMedia(true);
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });
};

// Custom render with providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export testing library utilities
export * from '@testing-library/react';
export { customRender as render, screen, fireEvent, waitFor };

// Utility to create test children
export const createTestChildren = (count: number) => 
  Array.from({ length: count }, (_, i) => <div key={i}>Child {i + 1}</div>);

// Custom matcher for Tailwind classes
expect.extend({
  toHaveClass(received, expected) {
    const pass = received.classList.contains(expected);
    if (pass) {
      return {
        message: () => `expected element not to have class "${expected}"`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected element to have class "${expected}"`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toHaveClass(expected: string): T;
    }
  }
}