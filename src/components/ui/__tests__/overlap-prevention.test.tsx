import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import {
  ResponsiveTabs,
  ResponsiveTabsList,
  ResponsiveTabsTrigger,
} from "@/components/admin/design/components/layouts/ResponsiveTabs"
import { CampaignBuilderShell } from "@/components/dashboard/newsletter/CampaignBuilderShell"
import { DesignSystemProvider } from "@/contexts/DesignSystemContext"
import AdminDesignComponents from "@/pages/AdminDesignComponents"

const renderAdminDesign = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DesignSystemProvider>
        <AdminDesignComponents />
      </DesignSystemProvider>
    </QueryClientProvider>,
  )

describe("Overlap Prevention", () => {
  describe("AdminDesignComponents", () => {
    it("should not use whitespace-nowrap on tabs", () => {
      renderAdminDesign()

      screen.getAllByRole("tab").forEach((tab) => {
        const styles = window.getComputedStyle(tab)
        expect(styles.whiteSpace).not.toBe("nowrap")
        expect(tab.className).toMatch(/truncate|min-w-0/)
      })
    })

    it("should have flex-wrap on tabs container", () => {
      renderAdminDesign()

      expect(screen.getByRole("tablist").className).toMatch(/flex-wrap/)
    })
  })

  describe("CampaignBuilderShell", () => {
    const mockProps = {
      left: <div>Left Panel</div>,
      center: <div>Center Panel</div>,
      right: <div>Right Panel</div>,
      toolbar: <div>Toolbar</div>,
    }

    it("should use minmax grid columns for flexible layouts", () => {
      render(<CampaignBuilderShell {...mockProps} />)

      expect(screen.getByTestId("campaigns-grid").className).toMatch(/minmax/)
    })

    it("should have flex-wrap on mobile toolbars", () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 400,
      })

      const { container } = render(<CampaignBuilderShell {...mockProps} />)

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- flex-wrap toolbar is a class-only layout marker
      const toolbar = container.querySelector(".flex.flex-wrap")
      expect(toolbar).toBeInTheDocument()
    })

    it("should prevent button overflow with flex-shrink-0", () => {
      render(<CampaignBuilderShell {...mockProps} />)

      const paneToggleButtons = screen
        .getAllByRole("button")
        .filter(
          (button) =>
            button.textContent?.includes("Blocks") || button.textContent?.includes("Inspector"),
        )

      expect(paneToggleButtons.length).toBeGreaterThan(0)
      for (const button of paneToggleButtons) {
        expect(button.className).toMatch(/flex-shrink-0/)
      }
    })
  })

  describe("ResponsiveTabs", () => {
    it("should handle long tab names without overflow", () => {
      render(
        <ResponsiveTabs defaultValue="tab1">
          <ResponsiveTabsList>
            <ResponsiveTabsTrigger value="tab1">
              Very Long Tab Name That Should Not Overflow
            </ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="tab2">Another Long Tab Name</ResponsiveTabsTrigger>
          </ResponsiveTabsList>
        </ResponsiveTabs>,
      )

      const tabs = screen.getAllByRole("tab")
      tabs.forEach((tab) => {
        expect(tab.className).toMatch(/truncate/)
        expect(tab.className).toMatch(/min-w-0/)
      })
    })

    it("should support wrapping when needed", () => {
      render(
        <ResponsiveTabs defaultValue="tab1">
          <ResponsiveTabsList className="flex-wrap">
            <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="tab3">Tab 3</ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="tab4">Tab 4</ResponsiveTabsTrigger>
          </ResponsiveTabsList>
        </ResponsiveTabs>,
      )

      expect(screen.getByRole("tablist").className).toMatch(/flex-wrap/)
    })
  })

  describe("Lint Pattern Validation", () => {
    it("should not contain risky CSS patterns", () => {
      const riskyPatterns = [
        /-mb-1\b/,
        /-mb-2\b/,
        /-mb-px\b/,
        /mt-\[-1px\]/,
        /whitespace-nowrap.*TabsList/,
        /TabsList.*whitespace-nowrap/,
      ]

      // Mock component code that should pass lint
      const safeCode = `
        <TabsList className="flex-wrap gap-1 mb-3">
          <TabsTrigger className="truncate min-w-0">Tab</TabsTrigger>
        </TabsList>
      `

      riskyPatterns.forEach((pattern) => {
        expect(pattern.test(safeCode)).toBe(false)
      })
    })

    it("should detect risky patterns correctly", () => {
      const riskyCode = `
        <TabsList className="whitespace-nowrap -mb-1">
          <TabsTrigger>Tab</TabsTrigger>
        </TabsList>
      `

      expect(/-mb-1\b/.test(riskyCode)).toBe(true)
      // The sample has `<TabsList className="whitespace-nowrap ...">` — TabsList precedes the class
      expect(/TabsList.*whitespace-nowrap/.test(riskyCode)).toBe(true)
    })
  })
})
