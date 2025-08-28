import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppMainNav } from '../AppMainNav';
import { SidebarProvider } from '@/components/ui/sidebar';

// Mock the hooks
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isAdmin: vi.fn(() => true),
    isLoading: false
  })
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback
  })
}));

const TestWrapper = ({ children, initialPath = '/' }: { children: React.ReactNode; initialPath?: string }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  // Set window location for testing
  Object.defineProperty(window, 'location', {
    value: { pathname: initialPath },
    writable: true
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AppMainNav Active States', () => {
  it('should highlight interactions/text as active on root path', () => {
    render(
      <TestWrapper initialPath="/">
        <AppMainNav />
      </TestWrapper>
    );

    const textMessagesLink = screen.getByRole('link', { name: /text messages/i });
    expect(textMessagesLink).toHaveAttribute('aria-current', 'page');
  });

  it('should highlight voice as active on /voice path', () => {
    render(
      <TestWrapper initialPath="/voice">
        <AppMainNav />
      </TestWrapper>
    );

    const voiceLink = screen.getByRole('link', { name: /voice calls/i });
    expect(voiceLink).toHaveAttribute('aria-current', 'page');
  });

  it('should highlight campaigns as active on /marketing path', () => {
    render(
      <TestWrapper initialPath="/marketing">
        <AppMainNav />
      </TestWrapper>
    );

    const campaignsLink = screen.getByRole('link', { name: /campaigns/i });
    expect(campaignsLink).toHaveAttribute('aria-current', 'page');
  });

  it('should highlight service tickets as active on /operations path', () => {
    render(
      <TestWrapper initialPath="/operations">
        <AppMainNav />
      </TestWrapper>
    );

    const ticketsLink = screen.getByRole('link', { name: /service tickets/i });
    expect(ticketsLink).toHaveAttribute('aria-current', 'page');
  });

  it('should highlight settings/general as active on /settings path', () => {
    render(
      <TestWrapper initialPath="/settings">
        <AppMainNav />
      </TestWrapper>
    );

    const generalLink = screen.getByRole('link', { name: /^general$/i });
    expect(generalLink).toHaveAttribute('aria-current', 'page');
  });
});