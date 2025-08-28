import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppHeader } from '@/components/dashboard/AppHeader';
import { ModernHeader } from '../ModernHeader';

// Mock the hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com' },
    signOut: vi.fn()
  })
}));

vi.mock('@/hooks/useDateFormatting', () => ({
  useDateFormatting: () => ({
    dateTime: vi.fn(() => new Date().toISOString()),
    timezone: 'UTC'
  })
}));

vi.mock('@/hooks/use-responsive', () => ({
  useIsMobile: () => false
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback
  })
}));

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn(() => ({
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useQuery: vi.fn(() => ({ data: [], isLoading: false, error: null })),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Header Tab Removal', () => {
  it('AppHeader should not render main navigation tabs', () => {
    render(
      <TestWrapper>
        <AppHeader />
      </TestWrapper>
    );

    // These should NOT exist as tabbable elements in the header
    expect(screen.queryByRole('tab', { name: /interactions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /marketing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /operations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /settings/i })).not.toBeInTheDocument();
    
    // Also check for buttons/links that might act as tabs
    expect(screen.queryByRole('button', { name: /interactions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /marketing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /operations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /settings/i })).not.toBeInTheDocument();
    
    // Should still have right-side actions like search, notifications, etc.
    expect(screen.getByRole('button', { name: /user/i })).toBeInTheDocument();
  });

  it('ModernHeader should not render main navigation tabs', () => {
    render(
      <TestWrapper>
        <ModernHeader />
      </TestWrapper>
    );

    // These should NOT exist as tabbable elements in the header
    expect(screen.queryByRole('tab', { name: /interactions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /marketing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /operations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /settings/i })).not.toBeInTheDocument();
  });
});