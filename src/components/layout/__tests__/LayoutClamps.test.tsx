import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from '@/pages/Index';

// Mock all the necessary hooks and components
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com' }
  })
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isAdmin: vi.fn(() => false),
    isLoading: false
  })
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback
  })
}));

vi.mock('@/components/dashboard/EnhancedInteractionsLayout', () => ({
  EnhancedInteractionsLayout: () => <div data-testid="interactions-content">Interactions</div>
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

describe('Layout Clamp Removal', () => {
  it('should not have shell-level max-width clamps on Interactions page', () => {
    const { container } = render(
      <TestWrapper>
        <Index />
      </TestWrapper>
    );

    // Check that no shell-level elements have centering classes
    const shellElements = container.querySelectorAll('[class*="max-w-"], [class*="mx-auto"], [class*="container"]');
    
    // Filter out any elements that are nested deep (pane-local centering is OK)
    const shellLevelElements = Array.from(shellElements).filter(el => {
      const parents = [];
      let parent = el.parentElement;
      while (parent && parents.length < 3) { // Only check top 3 levels
        parents.push(parent);
        parent = parent.parentElement;
      }
      return parents.length <= 2; // Shell-level elements
    });

    expect(shellLevelElements).toHaveLength(0);
  });

  it('should render interactions content without global centering', () => {
    const { container } = render(
      <TestWrapper>
        <Index />
      </TestWrapper>
    );

    const interactionsContent = container.querySelector('[data-testid="interactions-content"]');
    expect(interactionsContent).toBeInTheDocument();
    
    // Check that the main content wrapper doesn't have centering classes
    const mainContentArea = container.querySelector('main, [role="main"], .app-content');
    if (mainContentArea) {
      expect(mainContentArea.className).not.toMatch(/max-w-|mx-auto|container/);
    }
  });
});