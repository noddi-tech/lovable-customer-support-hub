import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import { UnifiedAppLayout } from '../UnifiedAppLayout';

// Mock the permissions hook
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isAdmin: () => false,
    isLoading: false,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('UnifiedAppLayout', () => {
  it('renders sidebar navigation with correct structure', () => {
    renderWithProviders(
      <UnifiedAppLayout>
        <div>Test Content</div>
      </UnifiedAppLayout>
    );

    // Check that sidebar groups are rendered
    expect(screen.getByText('Interactions')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    
    // Admin should not be visible for regular users
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    
    // Check that content is rendered
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    
    // Sidebar branding
    expect(screen.getByText('Customer Platform')).toBeInTheDocument();
  });

  it('renders without a top header bar', () => {
    renderWithProviders(
      <UnifiedAppLayout>
        <div>Test Content</div>
      </UnifiedAppLayout>
    );

    // No banner role — header has been removed
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    // Old header branding should be gone
    expect(screen.queryByText('Customer Support')).not.toBeInTheDocument();
  });
});
