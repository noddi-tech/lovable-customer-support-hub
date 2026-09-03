import { render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, it } from "vitest"
import i18n from "@/lib/i18n"
import NewsletterBuilder from "../../NewsletterBuilder"

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

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
)

describe("Campaign Pane Tabs Layout", () => {
  it("should not have tabs inside scroll areas", () => {
    render(
      <TestWrapper>
        <NewsletterBuilder />
      </TestWrapper>,
    )

    const leftTabs = screen.getByTestId("builder-left-tabs")
    const rightTabs = screen.getByTestId("builder-right-tabs")

    // Assert tabs are not inside any ScrollArea viewport
    /* eslint-disable testing-library/no-node-access -- layout guard: tabs must not nest under ScrollArea */
    expect(
      leftTabs.closest(
        "[data-radix-scroll-area-viewport], .ScrollAreaViewport, [data-radix-scroll-area]",
      ),
    ).toBeNull()
    expect(
      rightTabs.closest(
        "[data-radix-scroll-area-viewport], .ScrollAreaViewport, [data-radix-scroll-area]",
      ),
    ).toBeNull()
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

    // Find scrollable content areas within panes (should be the body row)
    /* eslint-disable testing-library/no-node-access -- overflow class is on non-semantic scroll body */
    const leftScrollable = leftPane.querySelector('[class*="overflow-y-auto"]')
    const rightScrollable = rightPane.querySelector('[class*="overflow-y-auto"]')
    /* eslint-enable testing-library/no-node-access */

    expect(leftScrollable).toBeInTheDocument()
    expect(rightScrollable).toBeInTheDocument()
  })
})
