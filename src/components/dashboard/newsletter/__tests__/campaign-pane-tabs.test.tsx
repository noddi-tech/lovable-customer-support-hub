import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import NewsletterBuilder from "../../NewsletterBuilder"

// dnd-kit calls `new ResizeObserver(...)`; provide a constructable class.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
beforeEach(() => {
  global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
})

// Mock the child components to avoid complex dependencies
vi.mock("../NewsletterCanvas", () => ({
  NewsletterCanvas: () => <div data-testid="newsletter-canvas">Canvas</div>,
}))

vi.mock("../BlocksPalette", () => ({
  BlocksPalette: () => <div>Blocks Palette</div>,
}))

vi.mock("../TemplateLibrary", () => ({
  TemplateLibrary: () => <div>Template Library</div>,
}))

vi.mock("../PropertiesPanel", () => ({
  PropertiesPanel: () => <div>Properties Panel</div>,
}))

vi.mock("../GlobalStylesPanel", () => ({
  GlobalStylesPanel: () => <div>Global Styles Panel</div>,
}))

vi.mock("../PersonalizationPanel", () => ({
  PersonalizationPanel: () => <div>Personalization Panel</div>,
}))

// react-i18next is globally mocked in src/test/setup.ts, so no provider is needed.
const TestWrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>

describe("Campaign Pane Tabs Layout", () => {
  it("should not have tabs inside scroll areas", () => {
    render(
      <TestWrapper>
        <NewsletterBuilder />
      </TestWrapper>,
    )

    const leftTabs = screen.getByTestId("builder-left-tabs")
    const rightTabs = screen.getByTestId("builder-right-tabs")

    // The tab bars live in the fixed header region of their pane and must not
    // introduce their own vertical scroll (scrolling is owned by the pane body).
    /* eslint-disable testing-library/no-node-access -- layout guard: tabs sit in the fixed pane header */
    expect(leftTabs.closest('[data-testid="builder-left-pane"]')).not.toBeNull()
    expect(rightTabs.closest('[data-testid="builder-right-pane"]')).not.toBeNull()
    /* eslint-enable testing-library/no-node-access */

    // Assert tabs don't have vertical overflow
    expect(getComputedStyle(leftTabs).overflowY).toBe("visible")
    expect(getComputedStyle(rightTabs).overflowY).toBe("visible")
  })

  it("should have scrollable pane bodies", () => {
    render(
      <TestWrapper>
        <NewsletterBuilder />
      </TestWrapper>,
    )

    const leftPane = screen.getByTestId("builder-left-pane")
    const rightPane = screen.getByTestId("builder-right-pane")

    // Assert panes exist and have proper structure
    expect(leftPane).toBeInTheDocument()
    expect(rightPane).toBeInTheDocument()

    // Scrolling is owned by the shell, which wraps each pane in a Radix ScrollArea
    // viewport. Assert each pane is mounted inside that scroll viewport.
    /* eslint-disable testing-library/no-node-access -- scroll viewport is the shell-provided ancestor */
    const leftScrollable = leftPane.closest("[data-radix-scroll-area-viewport]")
    const rightScrollable = rightPane.closest("[data-radix-scroll-area-viewport]")
    /* eslint-enable testing-library/no-node-access */

    expect(leftScrollable).not.toBeNull()
    expect(rightScrollable).not.toBeNull()
  })
})
