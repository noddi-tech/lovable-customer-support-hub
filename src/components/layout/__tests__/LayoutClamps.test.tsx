import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import Index from "@/pages/Index"
import { BrowserRouter } from "@/router/compat"

// Mock all the necessary hooks and components
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "1", email: "test@example.com" },
  }),
}))

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    isAdmin: vi.fn(() => false),
    isLoading: false,
  }),
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}))

vi.mock("@/components/dashboard/EnhancedInteractionsLayout", () => ({
  EnhancedInteractionsLayout: () => <div data-testid="interactions-content">Interactions</div>,
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe("Layout Clamp Removal", () => {
  it("should not have shell-level max-width clamps on Interactions page", () => {
    const { container } = render(
      <TestWrapper>
        <Index />
      </TestWrapper>,
    )

    // Check that no shell-level elements have centering classes
    /* eslint-disable testing-library/no-container, testing-library/no-node-access -- shell clamp scan needs DOM tree walk */
    const shellElements = container.querySelectorAll(
      '[class*="max-w-"], [class*="mx-auto"], [class*="container"]',
    )

    // Filter out any elements that are nested deep (pane-local centering is OK)
    const shellLevelElements = Array.from(shellElements).filter((el) => {
      const parents = []
      let parent = el.parentElement
      while (parent && parents.length < 3) {
        // Only check top 3 levels
        parents.push(parent)
        parent = parent.parentElement
      }
      return parents.length <= 2 // Shell-level elements
    })
    /* eslint-enable testing-library/no-container, testing-library/no-node-access */

    expect(shellLevelElements).toHaveLength(0)
  })

  it("should render interactions content without global centering", () => {
    const { container } = render(
      <TestWrapper>
        <Index />
      </TestWrapper>,
    )

    expect(screen.getByTestId("interactions-content")).toBeInTheDocument()

    // Check that the main content wrapper doesn't have centering classes
    /* eslint-disable testing-library/no-container, testing-library/no-node-access -- main landmark may lack accessible name in this shell */
    const mainContentArea = container.querySelector('main, [role="main"], .app-content')
    /* eslint-enable testing-library/no-container, testing-library/no-node-access */
    expect(mainContentArea).toBeTruthy()
    expect(mainContentArea?.className).not.toMatch(/max-w-|mx-auto|container/)
  })
})
